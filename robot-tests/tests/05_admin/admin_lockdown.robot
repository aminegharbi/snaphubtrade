*** Settings ***
Documentation    Section 12.2 of the test plan — the single most important
...              regression guard in this whole project: EVERY admin-suite
...              endpoint must reject non-admin callers. This is exactly the
...              class of bug that shipped originally (only 1 of ~30 modules
...              had any guard at all) — this suite exists specifically so
...              that can never silently happen again.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        security    admin-lockdown

*** Variables ***
# Every endpoint here MUST return 401 with no token and 403 with a non-admin
# token. Add a line whenever a new admin-only endpoint is introduced —
# this list is the actual enforcement mechanism, not just documentation.
@{ADMIN_ONLY_GET_ENDPOINTS}
...    /admin/stats
...    /admin/users
...    /admin/dealers
...    /admin/brokers
...    /admin/alerts
...    /executive/stats
...    /executive/tasks
...    /crm/stats
...    /crm/contacts
...    /crm/pipeline
...    /crm/deals
...    /marketing/dashboard
...    /affiliates/stats
...    /affiliates/leaderboard
...    /affiliates/payments
...    /email/analytics
...    /email/campaigns
...    /push/campaigns
...    /push/analytics
...    /reports/dealer/dummy-id-for-guard-check
...    /analytics/platform
...    /market-analysis/stats
...    /market-analytics/dashboard
...    /sessions/stats
...    /feature-flags

*** Test Cases ***
Admin Endpoint Rejects Missing Token
    [Documentation]    Parameterized over every endpoint in ADMIN_ONLY_GET_ENDPOINTS.
    [Template]    Assert Endpoint Rejects Anonymous Access
    FOR    ${endpoint}    IN    @{ADMIN_ONLY_GET_ENDPOINTS}
        ${endpoint}
    END

Admin Endpoint Rejects Dealer Token
    [Documentation]    A dealer account must never reach an admin-only endpoint.
    [Template]    Assert Endpoint Rejects Dealer Access
    FOR    ${endpoint}    IN    @{ADMIN_ONLY_GET_ENDPOINTS}
        ${endpoint}
    END

Admin Endpoint Rejects Broker Token
    [Documentation]    Same check for the broker role.
    [Template]    Assert Endpoint Rejects Broker Access
    FOR    ${endpoint}    IN    @{ADMIN_ONLY_GET_ENDPOINTS}
        ${endpoint}
    END

Admin Endpoint Rejects Buyer Token
    [Documentation]    Same check for the plain buyer role — the most common
    ...    account type, and the one an attacker is most likely to actually have.
    [Template]    Assert Endpoint Rejects Buyer Access
    FOR    ${endpoint}    IN    @{ADMIN_ONLY_GET_ENDPOINTS}
        ${endpoint}
    END

Valid Admin Token Is Accepted On Admin Stats
    [Documentation]    Sanity check paired with the rejection tests above —
    ...    proves the lockdown isn't accidentally blocking legitimate admins too.
    ${token}=    Get Admin Token
    ${headers}=    Auth Headers    ${token}
    ${resp}=    GET On Session    api    /admin/stats    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    dealers

Health Endpoint Remains Public
    [Documentation]    Sanity check the OTHER direction: the global auth guard
    ...    must not have accidentally locked down genuinely public endpoints
    ...    like the health check (used by Docker healthchecks / uptime monitors,
    ...    which don't carry a JWT).
    ${resp}=    GET On Session    api    /health    expected_status=200

Vehicle Catalog Remains Public
    [Documentation]    Same check for the public browsing catalog — this is the
    ...    core "anyone can browse cars without an account" product requirement.
    ${resp}=    GET On Session    api    /vehicles    expected_status=200

*** Keywords ***
Assert Endpoint Rejects Anonymous Access
    [Arguments]    ${endpoint}
    ${resp}=    GET On Session    api    ${endpoint}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    401
    ...    msg=${endpoint} should reject anonymous access with 401, got ${resp.status_code}

Assert Endpoint Rejects Dealer Access
    [Arguments]    ${endpoint}
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    ${endpoint}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    403
    ...    msg=${endpoint} should reject a dealer token with 403, got ${resp.status_code}

Assert Endpoint Rejects Broker Access
    [Arguments]    ${endpoint}
    ${broker}=    Register New Broker
    ${headers}=    Auth Headers    ${broker}[token]
    ${resp}=    GET On Session    api    ${endpoint}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    403
    ...    msg=${endpoint} should reject a broker token with 403, got ${resp.status_code}

Assert Endpoint Rejects Buyer Access
    [Arguments]    ${endpoint}
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${resp}=    GET On Session    api    ${endpoint}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    403
    ...    msg=${endpoint} should reject a buyer token with 403, got ${resp.status_code}
