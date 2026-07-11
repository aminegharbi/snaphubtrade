import { Module, Controller, Post, Body, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getAIClient, aiModel } from '../../shared/ai/ai-client';

@Injectable()
export class AssistantService {
  private anthropic = getAIClient();
  constructor(private prisma: PrismaService) {}

  async chat(message: string, history: any[] = []) {
    // Get live inventory context (lightweight)
    const stats = await this.prisma.vehicle.groupBy({
      by: ['make'], where: { status: 'available' }, _count: true, orderBy: { _count: { make: 'desc' } }, take: 10,
    });
    const makesContext = stats.map(s => `${s.make} (${s._count})`).join(', ');

    const priceRange = await this.prisma.vehicle.aggregate({
      where: { status: 'available' }, _min: { price_aed: true }, _max: { price_aed: true }, _avg: { price_aed: true },
    });

    const systemPrompt = `You are the DubaiAuto AI Assistant — a friendly, expert automotive advisor for UAE's premier car marketplace.

LIVE INVENTORY CONTEXT:
- Available makes: ${makesContext}
- Price range: AED ${Math.round(Number(priceRange._min.price_aed||0)).toLocaleString()} - AED ${Math.round(Number(priceRange._max.price_aed||0)).toLocaleString()}
- Average price: AED ${Math.round(Number(priceRange._avg.price_aed||0)).toLocaleString()}

YOUR CAPABILITIES:
- Recommend vehicles based on budget, use case, family size
- Compare vehicles and explain trade-offs
- Estimate fair prices and explain market value
- Answer technical questions about vehicles (engines, fuel types, maintenance)
- Guide export buyers on eligible vehicles and shipping
- Explain UAE car buying process (RTA registration, insurance, etc.)

GUIDELINES:
- Be concise (2-4 sentences typically, longer only if comparing multiple options)
- Always suggest searching the marketplace when relevant: "Search '[query]' on our marketplace"
- For prices, always say AED
- Be warm but professional — like a knowledgeable friend, not a salesperson
- If you don't know specific current inventory, suggest they use Smart Search`;

    try {
      const messages = [...history.map((h: any) => ({ role: h.role, content: h.content })), { role: 'user', content: message }];
      const r = await this.anthropic.messages.create({
        model: aiModel('sonnet'), max_tokens: 400, system: systemPrompt,
        messages,
      });
      const reply = r.content[0].type === 'text' ? r.content[0].text : '';

      // Extract suggested search query if mentioned
      const searchMatch = reply.match(/Search ['"]([^'"]+)['"]/i);
      const suggestedQuery = searchMatch ? searchMatch[1] : null;

      return { reply, suggested_query: suggestedQuery };
    } catch (err: any) {
      const detail = err?.message || err?.error?.message || JSON.stringify(err);
      console.error('[AssistantService] Anthropic API error:', detail);
      return {
        reply: `I'm having trouble connecting right now. Try browsing our Smart Search or contact a dealer directly via WhatsApp.`,
        suggested_query: null,
        _debug_error: process.env.NODE_ENV !== 'production' ? detail : undefined,
      };
    }
  }

  getQuickPrompts() {
    return [
      { label: '💰 Best deals under 150K', query: "What are the best deals available right now under AED 150,000?" },
      { label: '👨‍👩‍👧 Family SUV advice',     query: "I need a reliable family SUV, what do you recommend?" },
      { label: '✈️ Export to Africa',       query: "Which vehicles are best for export to Nigeria?" },
      { label: '⚡ Electric vs petrol',      query: "Should I buy an electric car in the UAE?" },
      { label: '📊 How is pricing decided?', query: "How does your AI valuation work?" },
    ];
  }
}

@Controller('assistant')
export class AssistantController {
  constructor(private svc: AssistantService) {}

  @Post('chat')
  chat(@Body() body: { message: string; history?: any[] }) {
    return this.svc.chat(body.message, body.history);
  }
}

@Module({ controllers: [AssistantController], providers: [AssistantService] })
export class AssistantModule {}
