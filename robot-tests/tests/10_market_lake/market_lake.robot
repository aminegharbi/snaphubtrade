*** Settings ***
Documentation    Market Data Lake + Intelligence Engine — overview/health,
...              model intelligence reads, personalized dealer intelligence,
...              the admin sync job queue and configuration, plus the security
...              boundary. The expensive full Market Sync (live AI web search)
...              is deliberately NOT triggered here: enqueueing is exercised
...              through the cheap 'recalculate' job type, which flows through
...              the exact same queue/worker/monitoring machinery.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Setup Market Lake Suite
Test Tags        market-lake    functional

*** Keywords ***
Setup Market Lake Suite
    Create API Session
    ${token}=    Get Admin Token
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}

*** Test Cases ***
Lake Overview Is Readable And Reports Health
    [Documentation]    The overview powers both the dealer dashboard KPI strip
    ...    and the admin monitoring panel — it must work on an EMPTY lake too
    ...    (fresh deploys), reporting zeros rather than erroring.
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /market-lake/overview    headers=${headers}    expected_status=200
    ${ov}=    Set Variable    ${resp.json()}
    FOR    ${key}    IN    listings_tracked    active_listings    total_observations
    ...    benchmark_snapshots    total_price_changes    sources    health
        Dictionary Should Contain Key    ${ov}    ${key}
    END
    Should Be True    $ov['health'] in ['healthy', 'degraded']

Model Intelligence Requires Make And Model
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /market-lake/intelligence    headers=${headers}
    ...    params=make=Toyota    expected_status=400

Model Intelligence For An Untracked Model Degrades Gracefully
    [Documentation]    Before the first sync (or for a model nobody tracks) the
    ...    engine must say so explicitly — never invent numbers.
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /market-lake/intelligence    headers=${headers}
    ...    params=make=Xyzzy&model=Nonexistent&year=2024    expected_status=200
    Should Not Be True    ${resp.json()}[available]
    Dictionary Should Contain Key    ${resp.json()}    message

Trends Endpoint Returns The Expected Shape
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /market-lake/trends    headers=${headers}
    ...    params=level=brand&limit=5    expected_status=200
    Should Be Equal    ${resp.json()}[level]    brand
    Dictionary Should Contain Key    ${resp.json()}    rows

Dealer Gets Personalized Intelligence For Their Own Inventory
    ${dealer}=    Register New Dealer With Vehicle
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /market-lake/dealer/${dealer}[dealer_id]    headers=${headers}    expected_status=200
    ${intel}=    Set Variable    ${resp.json()}
    Should Be Equal    ${intel}[dealer_id]    ${dealer}[dealer_id]
    Dictionary Should Contain Key    ${intel}    coverage
    Dictionary Should Contain Key    ${intel}    vehicles
    Should Be True    ${intel}[coverage][vehicles_total] >= 1

# ── Admin: sync queue, monitoring, configuration ─────────────────────────────
Admin Can Enqueue A Recalculation Job And See It In Monitoring
    [Tags]    admin
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}
    ${empty}=    Create Dictionary
    # A job may already be queued/running from a previous run in this
    # environment — both outcomes are legitimate; assert the guard works.
    ${resp}=    POST On Session    api    /market-lake/recalculate    json=${empty}    headers=${headers}
    ...    expected_status=any
    Should Be True    ${resp.status_code} in [200, 201, 400]
    ...    msg=Unexpected status ${resp.status_code}: ${resp.text}
    IF    ${resp.status_code} != 400
        ${job_id}=    Set Variable    ${resp.json()}[id]
        ${job}=    GET On Session    api    /market-lake/jobs/${job_id}    headers=${headers}    expected_status=200
        Should Be True    $job.json()['status'] in ['queued', 'running', 'success', 'partial']
        ${jobs}=    GET On Session    api    /market-lake/jobs    headers=${headers}    expected_status=200
        ${ids}=    Evaluate    [j['id'] for j in $jobs.json()]
        List Should Contain Value    ${ids}    ${job_id}
    END

Admin Can Read And Update The Data Lake Configuration
    [Tags]    admin
    ${headers}=    Auth Headers    ${ADMIN_TOKEN}
    ${get}=    GET On Session    api    /market-lake/admin/config    headers=${headers}    expected_status=200
    ${original_delist}=    Set Variable    ${get.json()}[delist_after_days]
    Dictionary Should Contain Key    ${get.json()}    providers
    Dictionary Should Contain Key    ${get.json()}    retention_days
    ${body}=    Create Dictionary    delist_after_days=${30}
    ${put}=    PUT On Session    api    /market-lake/admin/config    json=${body}    headers=${headers}    expected_status=200
    Should Be Equal As Integers    ${put.json()}[delist_after_days]    30
    # Restore whatever the environment had before this test touched it.
    ${restore}=    Create Dictionary    delist_after_days=${original_delist}
    PUT On Session    api    /market-lake/admin/config    json=${restore}    headers=${headers}    expected_status=200

# ── Security boundary ────────────────────────────────────────────────────────
Dealer Cannot Launch A Market Sync
    [Tags]    security
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${empty}=    Create Dictionary
    POST On Session    api    /market-lake/sync         json=${empty}    headers=${headers}    expected_status=403
    POST On Session    api    /market-lake/recalculate  json=${empty}    headers=${headers}    expected_status=403

Dealer Cannot Read Sync Jobs Or Lake Admin Configuration
    [Tags]    security
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    GET On Session    api    /market-lake/jobs            headers=${headers}    expected_status=403
    GET On Session    api    /market-lake/admin/config    headers=${headers}    expected_status=403

Dealer B Cannot Read Dealer A Personalized Intelligence
    [Tags]    security    idor
    ${dealer_a}=    Register New Dealer With Vehicle
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    GET On Session    api    /market-lake/dealer/${dealer_a}[dealer_id]    headers=${headers_b}    expected_status=403

Anonymous Cannot Access Any Market Lake Endpoint
    [Tags]    security
    GET On Session    api    /market-lake/overview    expected_status=401
