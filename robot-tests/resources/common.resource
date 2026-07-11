*** Settings ***
Documentation    Shared keywords: API session setup, account creation, auth headers.
...              Every suite that talks to the API should import this instead of
...              re-implementing login/register — keeps a single source of truth
...              for how the API contract works, so a backend change only needs
...              updating here.
Library          RequestsLibrary
Library          Collections
Library          ../libraries/DataFactory.py
Resource         variables.resource

*** Keywords ***
Create API Session
    [Documentation]    Opens the shared HTTP session used by every test. Call once
    ...    per suite in Suite Setup.
    ...    If ${TEST_BYPASS_TOKEN} is set (see variables.resource), attaches the
    ...    X-Test-Bypass header so the suite's many fixture-account registrations
    ...    don't trip the same rate limits a real attacker would hit. Leave it
    ...    empty to test against production rate limiting as-is (expect some
    ...    429s if the suite runs faster than the real limits allow).
    IF    $TEST_BYPASS_TOKEN
        ${headers}=    Create Dictionary    X-Test-Bypass=${TEST_BYPASS_TOKEN}
        Create Session    api    ${BASE_URL}    timeout=${DEFAULT_TIMEOUT}    verify=${True}    headers=${headers}
    ELSE
        Create Session    api    ${BASE_URL}    timeout=${DEFAULT_TIMEOUT}    verify=${True}
    END

Auth Headers
    [Documentation]    Builds the Authorization header dict for an access token.
    [Arguments]    ${token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Register New Buyer
    [Documentation]    Creates a fresh buyer account and returns a dict with
    ...    token/email/password/user_id — everything a test needs, in one call.
    ${email}=    Generate Test Email    buyer
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=201
    ${result}=    Create Dictionary
    ...    email=${email}    password=${password}
    ...    token=${resp.json()}[access_token]
    ...    user_id=${resp.json()}[user][id]
    RETURN    ${result}

Register New Dealer
    [Documentation]    Creates a fresh dealer account (buyer + linked Dealer record)
    ...    and returns token/dealer_id/user_id — the standard fixture for any test
    ...    that needs "a dealer who owns some vehicles".
    ${email}=    Generate Test Email    dealer
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}    role=dealer
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=201
    ${json}=    Set Variable    ${resp.json()}
    ${result}=    Create Dictionary
    ...    email=${email}    password=${password}
    ...    token=${json}[access_token]
    ...    user_id=${json}[user][id]
    ...    dealer_id=${json}[dealer][id]
    ...    dealer_slug=${json}[dealer][slug]
    RETURN    ${result}

Register New Broker
    [Documentation]    Creates a fresh broker account via the public broker
    ...    registration endpoint (separate from /auth/register in this codebase),
    ...    with a password so the broker can log in via the standard /auth/login
    ...    flow afterwards — returns a ready-to-use access token.
    ${email}=    Generate Test Email    broker
    ${full_name}=    Generate Full Name
    ${phone}=    Generate Phone Number
    ${password}=    Generate Strong Password
    ${body}=    Create Dictionary
    ...    full_name=${full_name}    email=${email}    phone=${phone}    password=${password}
    ${resp}=    POST On Session    api    /broker/register    json=${body}
    Should Be True    ${resp.status_code} in [200, 201]
    ...    msg=Broker registration failed: ${resp.status_code} ${resp.text}
    ${json}=    Set Variable    ${resp.json()}
    ${token}=    Login And Get Token    ${email}    ${password}
    ${result}=    Create Dictionary
    ...    email=${email}    password=${password}    token=${token}
    ...    broker_id=${json}[id]    affiliate_code=${json}[affiliate_code]
    RETURN    ${result}

Login And Get Token
    [Documentation]    Logs in with existing credentials, returns the access token.
    ...    Fails loudly (not silently) on bad credentials — a test relying on this
    ...    should know immediately if a fixture account broke.
    [Arguments]    ${email}    ${password}
    ${body}=    Create Dictionary    email=${email}    password=${password}
    ${resp}=    POST On Session    api    /auth/login    json=${body}    expected_status=200
    RETURN    ${resp.json()}[access_token]

Get Admin Token
    [Documentation]    Logs in with the break-glass admin account configured in
    ...    variables.resource. Cached as a suite variable so we don't re-login
    ...    for every single admin-tagged test in a suite.
    ${token}=    Login And Get Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    RETURN    ${token}

Expect Unauthorized
    [Documentation]    Asserts a request was rejected for missing/invalid auth (401).
    [Arguments]    ${response}
    Should Be Equal As Integers    ${response.status_code}    401
    ...    msg=Expected 401 Unauthorized but got ${response.status_code}: ${response.text}

Expect Forbidden
    [Documentation]    Asserts a request was rejected for insufficient permissions (403).
    ...    This is the critical anti-IDOR / role-boundary assertion used throughout
    ...    the security suites.
    [Arguments]    ${response}
    Should Be Equal As Integers    ${response.status_code}    403
    ...    msg=Expected 403 Forbidden but got ${response.status_code}: ${response.text}

Expect Bad Request
    [Arguments]    ${response}
    Should Be Equal As Integers    ${response.status_code}    400
    ...    msg=Expected 400 Bad Request but got ${response.status_code}: ${response.text}

Expect Not Found
    [Arguments]    ${response}
    Should Be Equal As Integers    ${response.status_code}    404
    ...    msg=Expected 404 Not Found but got ${response.status_code}: ${response.text}

Response Should Not Contain Password Hash
    [Documentation]    Regression guard: password_hash must NEVER appear in any
    ...    API response, no matter which endpoint. Call this on every response
    ...    that includes a user/dealer/broker object.
    [Arguments]    ${response}
    ${body}=    Convert To String    ${response.text}
    Should Not Contain    ${body}    password_hash
    ...    msg=SECURITY REGRESSION: password_hash leaked in API response!

Register New Dealer With Vehicle
    [Documentation]    Standard fixture for AI Twin / Leads / Market Lake tests:
    ...    a fresh dealer that owns one available vehicle. Returns the dealer
    ...    dict from Register New Dealer, extended with vehicle_id.
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary
    ...    make=Toyota    model=Land Cruiser    year=2024    price_aed=285000
    ...    vin=${vin}    mileage_km=15000    fuel_type=petrol    transmission=automatic
    ...    status=available
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=201
    Set To Dictionary    ${dealer}    vehicle_id=${resp.json()}[id]
    RETURN    ${dealer}

Create Buyer Request
    [Documentation]    Simulates a website visitor sending a "Request this
    ...    vehicle" inquiry (public endpoint, no auth). Returns the created
    ...    lead id. Buyer contact details are generated unless overridden.
    [Arguments]    ${dealer_id}    ${vehicle_id}=${None}    ${offer_price}=${None}    ${buyer_email}=${None}
    ${email}=    Run Keyword If    $buyer_email is None    Generate Test Email    buyer
    ...    ELSE    Set Variable    ${buyer_email}
    ${name}=    Generate Full Name
    ${phone}=    Generate Phone Number
    ${body}=    Create Dictionary
    ...    dealer_id=${dealer_id}    buyer_name=${name}    buyer_email=${email}    buyer_phone=${phone}
    Run Keyword If    $vehicle_id is not None    Set To Dictionary    ${body}    vehicle_id=${vehicle_id}
    Run Keyword If    $offer_price is not None    Set To Dictionary    ${body}    offer_price=${offer_price}
    ${resp}=    POST On Session    api    /crm/leads    json=${body}    expected_status=201
    RETURN    ${resp.json()}[id]
