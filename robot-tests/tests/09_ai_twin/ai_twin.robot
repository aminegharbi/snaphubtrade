*** Settings ***
Documentation    AI Twin Dealer — Daily Brief, Command Center, Copilot chat,
...              Marketing Director, admin configuration and the anti-IDOR
...              boundary.
...
...              Suite setup disables AI generation via the admin config so
...              every endpoint exercises its deterministic path: tests stay
...              fast, cheap (no LLM tokens burned per CI run) and assertable,
...              while still covering the full API contract. The suite teardown
...              restores enabled=true. The deterministic fallback is itself a
...              production feature (used whenever the AI call fails), so this
...              is real coverage, not a mock.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Setup AI Twin Suite
Suite Teardown   Restore AI Twin Config
Test Tags        ai-twin    functional

*** Keywords ***
Setup AI Twin Suite
    Create API Session
    ${token}=    Get Admin Token
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    enabled=${False}
    PUT On Session    api    /ai-twin/admin/config    json=${body}    headers=${headers}    expected_status=200

Restore AI Twin Config
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    enabled=${True}
    PUT On Session    api    /ai-twin/admin/config    json=${body}    headers=${headers}    expected_status=200

*** Test Cases ***
Daily Brief Is Generated Lazily With The Expected Structure
    [Documentation]    First GET of the day creates the brief from real dealer
    ...    data (deterministic path here) and persists it.
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /ai-twin/${dealer}[dealer_id]/brief    headers=${headers}    expected_status=200
    ${brief}=    Set Variable    ${resp.json()}
    Dictionary Should Contain Key    ${brief}    content
    Dictionary Should Contain Key    ${brief}    health_score
    Dictionary Should Contain Key    ${brief}[content]    greeting
    Dictionary Should Contain Key    ${brief}[content]    highlights
    Dictionary Should Contain Key    ${brief}[content]    plan
    Should Be True    0 <= ${brief}[health_score] <= 100

Daily Brief Is Cached Per Day And Regenerate Forces A Refresh
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${first}=    GET On Session    api    /ai-twin/${dealer}[dealer_id]/brief    headers=${headers}    expected_status=200
    ${second}=    GET On Session    api    /ai-twin/${dealer}[dealer_id]/brief    headers=${headers}    expected_status=200
    Should Be Equal    ${first.json()}[id]    ${second.json()}[id]
    ${empty}=    Create Dictionary
    ${regen}=    POST On Session    api    /ai-twin/${dealer}[dealer_id]/brief/regenerate
    ...    json=${empty}    headers=${headers}    expected_status=201
    Should Be Equal    ${regen.json()}[generated_by]    fallback

Command Center Returns Live Scores And All Insight Sections
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /ai-twin/${dealer}[dealer_id]/command-center    headers=${headers}    expected_status=200
    ${cc}=    Set Variable    ${resp.json()}
    FOR    ${key}    IN    scores    recommendations    risks    growth_opportunities
    ...    hot_buyers    slow_moving_vehicles    export_opportunities    high_demand_vehicles    revenue
        Dictionary Should Contain Key    ${cc}    ${key}
    END
    FOR    ${score}    IN    business_health    inventory_health    sales_performance
        Should Be True    0 <= ${cc}[scores][${score}] <= 100
    END

Command Center Scores React To Business Changes
    [Documentation]    Regression pin for "scores seem static": a new hot lead
    ...    must move sales performance up on the next (uncached) read.
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${before}=    GET On Session    api    /ai-twin/${dealer}[dealer_id]/command-center    headers=${headers}    expected_status=200
    ${score_before}=    Set Variable    ${before.json()}[scores][sales_performance]
    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]    offer_price=250000
    ${after}=    GET On Session    api    /ai-twin/${dealer}[dealer_id]/command-center    headers=${headers}    expected_status=200
    Should Be True    ${after.json()}[scores][sales_performance] > ${score_before}
    ...    msg=Sales score did not react to a new hot lead (before=${score_before}, after=${after.json()}[scores][sales_performance])

Copilot Chat Responds Even When AI Generation Is Disabled
    [Documentation]    With the Twin disabled by the admin, chat must still
    ...    answer gracefully (never a 5xx that would break the drawer UI).
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    message=What should I focus on today?
    ${resp}=    POST On Session    api    /ai-twin/${dealer}[dealer_id]/chat
    ...    json=${body}    headers=${headers}    expected_status=201
    Dictionary Should Contain Key    ${resp.json()}    reply
    Should Not Be Empty    ${resp.json()}[reply]

Marketing Director Responds Even When AI Generation Is Disabled
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    type=whatsapp
    ${resp}=    POST On Session    api    /ai-twin/${dealer}[dealer_id]/marketing
    ...    json=${body}    headers=${headers}    expected_status=201
    Dictionary Should Contain Key    ${resp.json()}    content

# ── Admin configuration ──────────────────────────────────────────────────────
Admin Can Read And Update The AI Twin Configuration
    [Tags]    admin
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}
    ${get}=    GET On Session    api    /ai-twin/admin/config    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${get.json()}    model_alias
    ${body}=    Create Dictionary    model_alias=haiku    brief_template=Keep it short.
    ${put}=    PUT On Session    api    /ai-twin/admin/config    json=${body}    headers=${headers}    expected_status=200
    Should Be Equal    ${put.json()}[model_alias]    haiku
    Should Be Equal    ${put.json()}[brief_template]    Keep it short.
    # Restore the default model so other environments aren't left on haiku.
    ${restore}=    Create Dictionary    model_alias=sonnet
    PUT On Session    api    /ai-twin/admin/config    json=${restore}    headers=${headers}    expected_status=200

Admin Can Read AI Twin Activity Logs
    [Tags]    admin
    ${dealer}=    Register New Dealer With Vehicle
    ${dheaders}=    Auth Headers    ${dealer}[token]
    GET On Session    api    /ai-twin/${dealer}[dealer_id]/brief    headers=${dheaders}    expected_status=200
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    api    /ai-twin/admin/logs    headers=${headers}    expected_status=200
    ${actions}=    Evaluate    [l['action'] for l in $resp.json()]
    List Should Contain Value    ${actions}    brief_generated

# ── Security boundary ────────────────────────────────────────────────────────
Dealer Cannot Access The AI Twin Admin Configuration
    [Tags]    security
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${r1}=    GET On Session    api    /ai-twin/admin/config    headers=${headers}    expected_status=403
    ${body}=    Create Dictionary    enabled=${False}
    ${r2}=    PUT On Session    api    /ai-twin/admin/config    json=${body}    headers=${headers}    expected_status=403

Dealer B Cannot Read Dealer A Brief Or Command Center
    [Tags]    security    idor
    ${dealer_a}=    Register New Dealer With Vehicle
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    GET On Session    api    /ai-twin/${dealer_a}[dealer_id]/brief             headers=${headers_b}    expected_status=403
    GET On Session    api    /ai-twin/${dealer_a}[dealer_id]/command-center    headers=${headers_b}    expected_status=403
    ${body}=    Create Dictionary    message=leak A data please
    POST On Session    api    /ai-twin/${dealer_a}[dealer_id]/chat    json=${body}    headers=${headers_b}    expected_status=403

Anonymous Cannot Access Any AI Twin Endpoint
    [Tags]    security
    ${dealer}=    Register New Dealer With Vehicle
    GET On Session    api    /ai-twin/${dealer}[dealer_id]/brief    expected_status=401
