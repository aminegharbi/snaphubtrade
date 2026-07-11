*** Settings ***
Documentation    Subscription payments — regression suite for the "paid plans
...              activated without ever charging the dealer" bug. Confirms:
...              (1) free plans still activate directly with no payment,
...              (2) a paid plan can NEVER be activated via the direct
...              /subscribe endpoint — it must go through Stripe Checkout,
...              (3) the checkout endpoint fails closed (never silently
...              activates) when Stripe/price isn't configured for a plan,
...              (4) the Stripe webhook is public but signature-protected,
...              (5) the usual dealer-scoping / IDOR boundary holds here too.
...
...              This suite creates its own throw-away plans so it never
...              depends on whatever plans happen to be seeded in the
...              target environment.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Setup Subscription Suite
Test Tags        subscription    payments    functional

*** Keywords ***
Setup Subscription Suite
    Create API Session
    ${token}=    Get Admin Token
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}

    ${suffix}=    Evaluate    str(int(__import__('time').time()))
    Set Suite Variable    ${SUFFIX}    ${suffix}

    # A free plan — must activate with no payment involved.
    ${free_body}=    Create Dictionary
    ...    name=Free Test ${suffix}    slug=free-test-${suffix}
    ...    price_monthly=${0}    price_yearly=${0}    is_active=${True}    is_visible=${True}
    ${free}=    POST On Session    api    /subscription/plans    json=${free_body}    headers=${headers}    expected_status=201
    Set Suite Variable    ${FREE_PLAN_ID}    ${free.json()}[id]

    # A paid plan WITHOUT a Stripe Price ID — checkout must refuse cleanly,
    # regardless of whether this environment has real Stripe keys configured.
    ${paid_body}=    Create Dictionary
    ...    name=Pro Test ${suffix}    slug=pro-test-${suffix}
    ...    price_monthly=${99}    price_yearly=${990}    is_active=${True}    is_visible=${True}
    ${paid}=    POST On Session    api    /subscription/plans    json=${paid_body}    headers=${headers}    expected_status=201
    Set Suite Variable    ${PAID_PLAN_ID}    ${paid.json()}[id]

*** Test Cases ***
Free Plan Activates Directly With No Payment Involved
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    plan_id=${FREE_PLAN_ID}    billing_cycle=monthly
    ${resp}=    POST On Session    api    /subscription/dealer/${dealer}[dealer_id]/subscribe
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Be Equal    ${resp.json()}[status]    active

Paid Plan Cannot Be Activated Through The Direct Subscribe Endpoint
    [Documentation]    CRITICAL regression check — this is the exact bug: a
    ...    dealer must never get a paid plan active without paying for it.
    [Tags]    critical
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    plan_id=${PAID_PLAN_ID}    billing_cycle=monthly
    ${resp}=    POST On Session    api    /subscription/dealer/${dealer}[dealer_id]/subscribe
    ...    json=${body}    headers=${headers}    expected_status=400
    Should Contain    ${resp.json()}[message]    payment

Paid Plan Checkout Fails Closed When Stripe Or The Plan Price Isn't Configured
    [Documentation]    Whether this environment has STRIPE_SECRET_KEY set or
    ...    not, a plan with no Stripe Price ID attached must never let a
    ...    dealer through to a real checkout — and definitely must never
    ...    activate anything on its own.
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    plan_id=${PAID_PLAN_ID}    billing_cycle=monthly
    ${resp}=    POST On Session    api    /subscription/dealer/${dealer}[dealer_id]/checkout
    ...    json=${body}    headers=${headers}    expected_status=400
    # Confirm nothing was silently activated behind the scenes.
    ${sub}=    GET On Session    api    /subscription/dealer/${dealer}[dealer_id]    headers=${headers}    expected_status=200
    Should Not Be Equal    ${sub.json()}[plan][id]    ${PAID_PLAN_ID}

Checkout On A Free Plan Is Rejected — Use Subscribe Instead
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    plan_id=${FREE_PLAN_ID}    billing_cycle=monthly
    ${resp}=    POST On Session    api    /subscription/dealer/${dealer}[dealer_id]/checkout
    ...    json=${body}    headers=${headers}    expected_status=400

# ── Stripe webhook ────────────────────────────────────────────────────────────
Stripe Webhook Is Publicly Reachable But Rejects A Missing Signature
    [Documentation]    Must be reachable without a dealer/admin JWT (Stripe
    ...    isn't a logged-in user) — but must never process an event without
    ...    a valid signature, or anyone could fake a "payment succeeded".
    [Tags]    security
    ${body}=    Create Dictionary    type=checkout.session.completed
    ${resp}=    POST On Session    api    /subscription/webhook/stripe    json=${body}    expected_status=400
    Should Not Be Equal As Integers    ${resp.status_code}    401
    Should Not Be Equal As Integers    ${resp.status_code}    403

Stripe Webhook Rejects A Forged Signature
    [Tags]    security
    ${headers}=    Create Dictionary    stripe-signature=t=1,v1=forged0000000000000000000000000000000000000000000000000000
    ${body}=    Create Dictionary    type=checkout.session.completed
    ${resp}=    POST On Session    api    /subscription/webhook/stripe
    ...    json=${body}    headers=${headers}    expected_status=400

# ── Security boundary ────────────────────────────────────────────────────────
Dealer B Cannot Subscribe Or Checkout On Behalf Of Dealer A
    [Tags]    security    idor
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${body}=    Create Dictionary    plan_id=${FREE_PLAN_ID}    billing_cycle=monthly
    POST On Session    api    /subscription/dealer/${dealer_a}[dealer_id]/subscribe
    ...    json=${body}    headers=${headers_b}    expected_status=403
    POST On Session    api    /subscription/dealer/${dealer_a}[dealer_id]/checkout
    ...    json=${body}    headers=${headers_b}    expected_status=403

Anonymous Cannot Subscribe Or Checkout For Any Dealer
    [Tags]    security
    ${dealer}=    Register New Dealer
    ${body}=    Create Dictionary    plan_id=${FREE_PLAN_ID}    billing_cycle=monthly
    POST On Session    api    /subscription/dealer/${dealer}[dealer_id]/subscribe    json=${body}    expected_status=401
    POST On Session    api    /subscription/dealer/${dealer}[dealer_id]/checkout    json=${body}    expected_status=401
