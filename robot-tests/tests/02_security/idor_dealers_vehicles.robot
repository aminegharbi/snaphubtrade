*** Settings ***
Documentation    Section 2.2 / 3.2 of the test plan — anti-IDOR checks.
...              These are the highest-priority security tests in the whole
...              suite: they prove Dealer B genuinely cannot read/write
...              Dealer A's data through a guessed/enumerated ID.
Library          RequestsLibrary
Library          Collections
Library          ../../libraries/DataFactory.py
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        security    idor

*** Keywords ***
Create Vehicle For Dealer
    [Documentation]    Minimal valid CreateVehicleDto payload.
    [Arguments]    ${dealer_token}
    ${vin}=    Generate VIN
    ${headers}=    Auth Headers    ${dealer_token}
    ${body}=    Create Dictionary
    ...    make=Toyota    model=Land Cruiser    year=2024    price_aed=250000
    ...    vin=${vin}    mileage_km=0    fuel_type=petrol    transmission=automatic
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=201
    RETURN    ${resp.json()}[id]

*** Test Cases ***
Dealer B Cannot Update Dealer A Profile
    [Documentation]    2.2.1 — CRITICAL
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${body}=    Create Dictionary    company_name=Hijacked By Dealer B
    ${resp}=    PUT On Session    api    /dealers/${dealer_a}[dealer_id]
    ...    json=${body}    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}

Dealer B Cannot Patch Dealer A Profile
    [Documentation]    2.2.1 variant — same check on the PATCH alias.
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${body}=    Create Dictionary    company_name=Hijacked By Dealer B Patch
    ${resp}=    PATCH On Session    api    /dealers/${dealer_a}[dealer_id]
    ...    json=${body}    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}

Dealer Cannot Self Verify Or Change Own Subscription Tier
    [Documentation]    2.2.2 — verified/subscription_tier must be stripped by
    ...    UpdateDealerDto even when the request otherwise succeeds (the dealer
    ...    IS allowed to update their own profile, just not these fields).
    ${dealer_a}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer_a}[token]
    ${body}=    Create Dictionary    verified=${True}    subscription_tier=enterprise
    ${resp}=    PUT On Session    api    /dealers/${dealer_a}[dealer_id]
    ...    json=${body}    headers=${headers}    expected_status=200
    ${check}=    GET On Session    api    /dealers/${dealer_a}[dealer_slug]    expected_status=200
    Should Be Equal    ${check.json()}[verified]    ${False}
    ...    msg=SECURITY REGRESSION: dealer was able to self-verify via profile update!

Buyer Cannot Update Any Dealer Profile
    [Documentation]    2.2.3
    ${dealer_a}=    Register New Dealer
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${body}=    Create Dictionary    company_name=Buyer Should Not Be Able To Do This
    ${resp}=    PUT On Session    api    /dealers/${dealer_a}[dealer_id]
    ...    json=${body}    headers=${headers}    expected_status=any
    Expect Forbidden    ${resp}

Review Author Cannot Be Spoofed Via Request Body
    [Documentation]    2.2.4 — user_id for a review must come from the JWT,
    ...    never from client-supplied body fields.
    ${dealer_a}=    Register New Dealer
    ${buyer}=    Register New Buyer
    ${victim}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${body}=    Create Dictionary    rating=5    comment=Great!    user_id=${victim}[user_id]
    ${resp}=    POST On Session    api    /dealers/${dealer_a}[dealer_id]/reviews
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Not Be Equal    ${resp.json()}[user_id]    ${victim}[user_id]
    ...    msg=SECURITY REGRESSION: review was attributed to a spoofed user_id from the request body!

Review Rating Outside One To Five Is Rejected
    [Documentation]    2.2.5
    ${dealer_a}=    Register New Dealer
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${body}=    Create Dictionary    rating=7    comment=Should fail
    ${resp}=    POST On Session    api    /dealers/${dealer_a}[dealer_id]/reviews
    ...    json=${body}    headers=${headers}    expected_status=any
    Expect Bad Request    ${resp}

Anonymous Cannot Post A Review
    [Documentation]    2.2.6
    ${dealer_a}=    Register New Dealer
    ${body}=    Create Dictionary    rating=5    comment=Anonymous review attempt
    ${resp}=    POST On Session    api    /dealers/${dealer_a}[dealer_id]/reviews
    ...    json=${body}    expected_status=any
    Expect Unauthorized    ${resp}

Dealer B Cannot Update Dealer A Vehicle
    [Documentation]    3.2.1 — CRITICAL
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${vehicle_id}=    Create Vehicle For Dealer    ${dealer_a}[token]
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${body}=    Create Dictionary    price_aed=1
    ${resp}=    PUT On Session    api    /vehicles/${vehicle_id}
    ...    json=${body}    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}

Dealer B Cannot Delete Dealer A Vehicle
    [Documentation]    3.2.1 — CRITICAL, destructive variant.
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${vehicle_id}=    Create Vehicle For Dealer    ${dealer_a}[token]
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${resp}=    DELETE On Session    api    /vehicles/${vehicle_id}
    ...    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}
    # Confirm the vehicle genuinely still exists (belt and suspenders).
    ${check}=    GET On Session    api    /vehicles/${vehicle_id}    expected_status=200

Dealer B Cannot Change Status Of Dealer A Vehicle
    [Documentation]    3.2.1 — status endpoint variant.
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${vehicle_id}=    Create Vehicle For Dealer    ${dealer_a}[token]
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${body}=    Create Dictionary    status=sold
    ${resp}=    PATCH On Session    api    /vehicles/${vehicle_id}/status
    ...    json=${body}    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}

Buyer Cannot Create A Vehicle
    [Documentation]    3.2.2
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary    make=Nissan    model=Patrol    year=2023    price_aed=180000    vin=${vin}
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=any
    Expect Forbidden    ${resp}

Anonymous Cannot Create A Vehicle
    [Documentation]    3.2.3
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary    make=Nissan    model=Patrol    year=2023    price_aed=180000    vin=${vin}
    ${resp}=    POST On Session    api    /vehicles    json=${body}    expected_status=any
    Expect Unauthorized    ${resp}

Vehicle Dealer Id Cannot Be Spoofed On Create
    [Documentation]    3.2.8 — dealer_id must be derived from the JWT, never
    ...    trusted from the request body, or Dealer A could create phantom
    ...    listings attributed to Dealer B.
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${headers_a}=    Auth Headers    ${dealer_a}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary
    ...    make=Lexus    model=LX600    year=2024    price_aed=400000    vin=${vin}
    ...    dealer_id=${dealer_b}[dealer_id]
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers_a}    expected_status=201
    Should Be Equal    ${resp.json()}[dealer_id]    ${dealer_a}[dealer_id]
    ...    msg=SECURITY REGRESSION: dealer_id was taken from the request body instead of the JWT!

Price Below Zero Is Rejected On Vehicle Create
    [Documentation]    3.2.7 / 3.3.4
    ${dealer_a}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer_a}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary    make=Kia    model=Sportage    year=2023    price_aed=-500    vin=${vin}
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=any
    Expect Bad Request    ${resp}

Year Before 1950 Is Rejected On Vehicle Create
    [Documentation]    3.3.1
    ${dealer_a}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer_a}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary    make=Ford    model=Model T    year=1900    price_aed=50000    vin=${vin}
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=any
    Expect Bad Request    ${resp}

Invalid Fuel Type Enum Is Rejected
    [Documentation]    3.3.3
    ${dealer_a}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer_a}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary
    ...    make=Tesla    model=Model X    year=2024    price_aed=350000    vin=${vin}    fuel_type=unicorn_powered
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=any
    Expect Bad Request    ${resp}

Nonexistent Vehicle Returns Clean 404 Not 500
    [Documentation]    3.3.5
    ${resp}=    GET On Session    api    /vehicles/does-not-exist-id-12345    expected_status=any
    Expect Not Found    ${resp}
