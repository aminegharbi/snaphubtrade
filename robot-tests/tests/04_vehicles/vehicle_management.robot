*** Settings ***
Documentation    Functional (non-security) checks for the vehicle listing
...              lifecycle — section 3.1 of the test plan.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        vehicles    functional

*** Test Cases ***
Public Can Browse Vehicles Without Authentication
    [Documentation]    3.1.1
    ${resp}=    GET On Session    api    /vehicles    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    items

Public Can View Featured Vehicles And Makes List
    [Documentation]    3.1.2
    GET On Session    api    /vehicles/featured    expected_status=200
    GET On Session    api    /vehicles/makes    expected_status=200

Dealer Can Create A Vehicle Listing
    [Documentation]    3.1.3 — also confirms dealer_id is correctly derived
    ...    from the JWT rather than requiring it in the payload.
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${vin}=    Generate VIN
    ${body}=    Create Dictionary
    ...    make=BMW    model=X7    year=2024    price_aed=420000
    ...    vin=${vin}    mileage_km=0    fuel_type=petrol    transmission=automatic
    ...    status=available
    ${resp}=    POST On Session    api    /vehicles    json=${body}    headers=${headers}    expected_status=201
    Should Be Equal    ${resp.json()}[dealer_id]    ${dealer}[dealer_id]
    Should Be Equal    ${resp.json()}[make]    BMW

Dealer Can Update Their Own Vehicle
    [Documentation]    3.1.4
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${vin}=    Generate VIN
    ${create_body}=    Create Dictionary
    ...    make=Audi    model=Q8    year=2023    price_aed=310000    vin=${vin}
    ${created}=    POST On Session    api    /vehicles    json=${create_body}    headers=${headers}    expected_status=201
    ${vehicle_id}=    Set Variable    ${created.json()}[id]
    ${update_body}=    Create Dictionary    price_aed=299000
    ${resp}=    PUT On Session    api    /vehicles/${vehicle_id}
    ...    json=${update_body}    headers=${headers}    expected_status=200
    Should Be Equal As Numbers    ${resp.json()}[price_aed]    299000

Dealer Can Change Vehicle Status
    [Documentation]    3.1.5
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${vin}=    Generate VIN
    ${create_body}=    Create Dictionary    make=Honda    model=CR-V    year=2022    price_aed=85000    vin=${vin}
    ${created}=    POST On Session    api    /vehicles    json=${create_body}    headers=${headers}    expected_status=201
    ${vehicle_id}=    Set Variable    ${created.json()}[id]
    ${status_body}=    Create Dictionary    status=reserved
    ${resp}=    PATCH On Session    api    /vehicles/${vehicle_id}/status
    ...    json=${status_body}    headers=${headers}    expected_status=200
    Should Be Equal    ${resp.json()}[status]    reserved

Dealer Can Delete Their Own Vehicle
    [Documentation]    3.1.8
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${vin}=    Generate VIN
    ${create_body}=    Create Dictionary    make=Mazda    model=CX-5    year=2021    price_aed=65000    vin=${vin}
    ${created}=    POST On Session    api    /vehicles    json=${create_body}    headers=${headers}    expected_status=201
    ${vehicle_id}=    Set Variable    ${created.json()}[id]
    DELETE On Session    api    /vehicles/${vehicle_id}    headers=${headers}    expected_status=204
    ${check}=    GET On Session    api    /vehicles/${vehicle_id}    expected_status=any
    Expect Not Found    ${check}
