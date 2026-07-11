import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt({ message: 'Rating must be a whole number' })
  @Min(1, { message: 'Minimum rating is 1' })
  @Max(5, { message: 'Maximum rating is 5' })
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  // user_id is derived server-side from the authenticated JWT (req.user.userId),
  // never trusted from the request body.
}
