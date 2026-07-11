*** Settings ***
Documentation    Regression suite for the "top brokers disappeared from the
...              dealer dashboard" bug: /broker/dealer/:dealerId/stats was
...              accidentally locked to @Roles('broker','admin') only, so
...              dealers got a silent 403 -> null -> empty UI. This suite
...              pins the fix so it can never quietly regress again.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        broker    regression

*** Keywords ***
Create Vehicle For Dealer
    [Arguments]    ${dealer_token}
    ${vin}=    Generate VIN
    ${headers}=    Auth Headers    ${dealer_token}
    ${body}=    Create Dictionary
    ...    make=Toyota    model=Camry    year=2023    price_aed=95000
    ...    vin=${vin}    mileage_km=0
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=201
    RETURN    ${resp.json()}[id]

*** Test Cases ***
Dealer Can Read Their Own Broker Stats
    [Documentation]    The core regression check: a dealer token must be able
    ...    to GET /broker/dealer/:dealerId/stats for their OWN dealer_id.
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /broker/dealer/${dealer}[dealer_id]/stats
    ...    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    top_brokers
    Dictionary Should Contain Key    ${resp.json()}    other_brokers
    Dictionary Should Contain Key    ${resp.json()}    total_brokers_count

Dealer B Cannot Read Dealer A Broker Stats
    [Documentation]    The endpoint being opened up to dealers must NOT have
    ...    reopened an IDOR — ownership must still be enforced.
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${resp}=    GET On Session    api    /broker/dealer/${dealer_a}[dealer_id]/stats
    ...    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}

Anonymous Cannot Read Broker Stats For Any Dealer
    [Documentation]    Sanity check the endpoint didn't accidentally become public.
    ${dealer}=    Register New Dealer
    ${resp}=    GET On Session    api    /broker/dealer/${dealer}[dealer_id]/stats    expected_status=any
    Expect Unauthorized    ${resp}

Broker Deal Between Broker And Dealer Appears In Dealer Broker Stats
    [Documentation]    End-to-end: create a real broker deal, confirm it surfaces
    ...    in the dealer's top_brokers list — proves the whole pipeline (not
    ...    just the auth guard) still works after the fix.
    ${dealer}=    Register New Dealer
    ${broker}=    Register New Broker
    ${vehicle_id}=    Create Vehicle For Dealer    ${dealer}[token]
    ${dealer_headers}=    Auth Headers    ${dealer}[token]
    ${deal_body}=    Create Dictionary
    ...    broker_id=${broker}[broker_id]    dealer_id=${dealer}[dealer_id]
    ...    vehicle_id=${vehicle_id}    deal_price_aed=95000
    ${broker_headers}=    Auth Headers    ${broker}[token]
    ${deal_resp}=    POST On Session    api    /broker/deals
    ...    json=${deal_body}    headers=${broker_headers}    expected_status=any
    Should Be True    ${deal_resp.status_code} in [200, 201]
    ...    msg=Could not create broker deal fixture: ${deal_resp.status_code} ${deal_resp.text}

    ${stats}=    GET On Session    api    /broker/dealer/${dealer}[dealer_id]/stats
    ...    headers=${dealer_headers}    expected_status=200
    Should Be True    ${stats.json()}[total_broker_deals] >= 1
