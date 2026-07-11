*** Settings ***
Documentation    Shared-inventory request processing — regression suite for the
...              missing back-half of the network request flow: accepting a
...              request used to only flip a message status and notify.
...              Confirms accepting now actually: reserves the vehicle (stock
...              decrement, status change) for a reserve_request, or completes
...              a sale (stock decrement, sold_units increment, status →
...              sold, draft invoice raised) for a transfer_request/offer —
...              and that declining changes nothing on the vehicle.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        collaborative    shared_inventory    functional

*** Keywords ***
Share Vehicle With Dealer
    [Arguments]    ${owner}    ${vehicle_id}    ${recipient_dealer_id}    ${can_reserve}=${True}    ${can_transfer}=${True}
    ${headers}=    Auth Headers    ${owner}[token]
    ${perms}=    Create Dictionary    can_propose=${True}    can_reserve=${can_reserve}    can_transfer=${can_transfer}    can_negotiate=${True}
    ${dealer_ids}=    Create List    ${recipient_dealer_id}
    ${body}=    Create Dictionary    owner_dealer_id=${owner}[dealer_id]    visibility=selected
    ...    dealer_ids=${dealer_ids}    permissions=${perms}
    POST On Session    api    /collaborative/vehicles/${vehicle_id}/share    json=${body}    headers=${headers}    expected_status=201

Send Collaboration Message
    [Arguments]    ${sender}    ${vehicle_id}    ${to_dealer_id}    ${msg_type}    ${offer_price}=${None}
    ${headers}=    Auth Headers    ${sender}[token]
    ${body}=    Create Dictionary    from_dealer_id=${sender}[dealer_id]    to_dealer_id=${to_dealer_id}
    ...    msg_type=${msg_type}    content=${msg_type}
    Run Keyword If    $offer_price is not None    Set To Dictionary    ${body}    offer_price_aed=${offer_price}
    ${resp}=    POST On Session    api    /collaborative/vehicles/${vehicle_id}/messages    json=${body}    headers=${headers}    expected_status=201
    RETURN    ${resp.json()}[id]

Get Vehicle
    [Arguments]    ${owner}    ${vehicle_id}
    ${headers}=    Auth Headers    ${owner}[token]
    ${resp}=    GET On Session    api    /vehicles/${vehicle_id}    headers=${headers}    expected_status=200
    RETURN    ${resp.json()}

*** Test Cases ***
Accepting A Reserve Request Reserves The Vehicle And Decrements Stock
    [Tags]    critical
    ${owner}=    Register New Dealer With Vehicle
    ${requester}=    Register New Dealer
    Share Vehicle With Dealer    ${owner}    ${owner}[vehicle_id]    ${requester}[dealer_id]

    ${before}=    Get Vehicle    ${owner}    ${owner}[vehicle_id]
    Should Be Equal    ${before}[status]    available

    ${msg_id}=    Send Collaboration Message    ${requester}    ${owner}[vehicle_id]    ${owner}[dealer_id]    reserve_request

    ${owner_headers}=    Auth Headers    ${owner}[token]
    ${body}=    Create Dictionary    response=accepted    dealer_id=${owner}[dealer_id]
    ${resp}=    PATCH On Session    api    /collaborative/messages/${msg_id}/respond    json=${body}    headers=${owner_headers}    expected_status=200
    Should Be Equal    ${resp.json()}[outcome][kind]    reserved

    ${after}=    Get Vehicle    ${owner}    ${owner}[vehicle_id]
    Should Be Equal    ${after}[status]    reserved
    Should Be True    ${after}[stock_quantity] < ${before}[stock_quantity]

Accepting A Transfer Request Sells The Vehicle Increments Sold Units And Raises An Invoice
    [Tags]    critical
    ${owner}=    Register New Dealer With Vehicle
    ${requester}=    Register New Dealer
    Share Vehicle With Dealer    ${owner}    ${owner}[vehicle_id]    ${requester}[dealer_id]

    ${before}=    Get Vehicle    ${owner}    ${owner}[vehicle_id]
    ${before_sold}=    Set Variable    ${before}[sold_units]

    ${msg_id}=    Send Collaboration Message    ${requester}    ${owner}[vehicle_id]    ${owner}[dealer_id]    transfer_request

    ${owner_headers}=    Auth Headers    ${owner}[token]
    ${body}=    Create Dictionary    response=accepted    dealer_id=${owner}[dealer_id]
    ${resp}=    PATCH On Session    api    /collaborative/messages/${msg_id}/respond    json=${body}    headers=${owner_headers}    expected_status=200
    ${outcome}=    Set Variable    ${resp.json()}[outcome]
    Should Be Equal    ${outcome}[kind]    sold
    Should Not Be Equal    ${outcome}[auto_invoice]    ${None}
    Should Contain    ${outcome}[auto_invoice][invoice_number]    INV-

    ${after}=    Get Vehicle    ${owner}    ${owner}[vehicle_id]
    Should Be Equal    ${after}[status]    sold
    ${expected_sold}=    Evaluate    ${before_sold} + 1
    Should Be Equal As Integers    ${after}[sold_units]    ${expected_sold}

    # KPIs: the invoice must actually be attached to the owning dealer's
    # billing, not just floating — this is what "MAJ des KPIs" depends on.
    ${invoices}=    GET On Session    api    /billing/invoices?dealer_id=${owner}[dealer_id]    headers=${owner_headers}    expected_status=200
    ${numbers}=    Evaluate    [i['invoice_number'] for i in $invoices.json()['items']] if 'items' in $invoices.json() else [i['invoice_number'] for i in $invoices.json()]
    List Should Contain Value    ${numbers}    ${outcome}[auto_invoice][invoice_number]

Declining A Request Leaves The Vehicle Untouched
    ${owner}=    Register New Dealer With Vehicle
    ${requester}=    Register New Dealer
    Share Vehicle With Dealer    ${owner}    ${owner}[vehicle_id]    ${requester}[dealer_id]

    ${before}=    Get Vehicle    ${owner}    ${owner}[vehicle_id]
    ${msg_id}=    Send Collaboration Message    ${requester}    ${owner}[vehicle_id]    ${owner}[dealer_id]    transfer_request

    ${owner_headers}=    Auth Headers    ${owner}[token]
    ${body}=    Create Dictionary    response=declined    dealer_id=${owner}[dealer_id]
    ${resp}=    PATCH On Session    api    /collaborative/messages/${msg_id}/respond    json=${body}    headers=${owner_headers}    expected_status=200
    Should Be Equal    ${resp.json()}[outcome]    ${None}

    ${after}=    Get Vehicle    ${owner}    ${owner}[vehicle_id]
    Should Be Equal    ${after}[status]    ${before}[status]
    Should Be Equal    ${after}[stock_quantity]    ${before}[stock_quantity]

Broker Can Reserve A Shared Vehicle
    [Documentation]    Regression check — the "Reserve" button existed on
    ...    every card but had no working action at all, only "Request
    ...    Transfer" did.
    [Tags]    critical
    ${owner}=    Register New Dealer With Vehicle
    ${broker}=    Register New Broker
    ${headers}=    Auth Headers    ${owner}[token]
    ${perms}=    Create Dictionary    can_propose=${True}    can_reserve=${True}    can_transfer=${True}    can_negotiate=${True}
    ${broker_ids}=    Create List    ${broker}[broker_id]
    ${body}=    Create Dictionary    owner_dealer_id=${owner}[dealer_id]    visibility=selected
    ...    broker_ids=${broker_ids}    permissions=${perms}
    POST On Session    api    /collaborative/vehicles/${owner}[vehicle_id]/share    json=${body}    headers=${headers}    expected_status=201

    ${broker_headers}=    Auth Headers    ${broker}[token]
    ${reserve_body}=    Create Dictionary    broker_id=${broker}[broker_id]
    ${resp}=    POST On Session    api    /collaborative/vehicles/${owner}[vehicle_id]/request-reserve
    ...    json=${reserve_body}    headers=${broker_headers}    expected_status=201
    Should Be Equal    ${resp.json()}[msg_type]    reserve_request

Broker Can Act On A Full-Network Share Without An Explicit Permission Row
    [Documentation]    A second, subtler bug: requestTransfer/requestReserve
    ...    only checked the explicit BrokerSharePermission table, which is
    ...    never populated for 'network_all' shares (access is implicit) —
    ...    so brokers got a 403 even though the UI showed the button.
    ${owner}=    Register New Dealer With Vehicle
    ${broker}=    Register New Broker
    ${headers}=    Auth Headers    ${owner}[token]
    ${perms}=    Create Dictionary    can_propose=${True}    can_reserve=${True}    can_transfer=${True}    can_negotiate=${True}
    ${body}=    Create Dictionary    owner_dealer_id=${owner}[dealer_id]    visibility=network_all    permissions=${perms}
    POST On Session    api    /collaborative/vehicles/${owner}[vehicle_id]/share    json=${body}    headers=${headers}    expected_status=201

    ${broker_headers}=    Auth Headers    ${broker}[token]
    ${reserve_body}=    Create Dictionary    broker_id=${broker}[broker_id]
    POST On Session    api    /collaborative/vehicles/${owner}[vehicle_id]/request-reserve
    ...    json=${reserve_body}    headers=${broker_headers}    expected_status=201

Only The Owning Dealer Can Respond To Their Incoming Request
    [Tags]    security    idor
    ${owner}=    Register New Dealer With Vehicle
    ${requester}=    Register New Dealer
    ${stranger}=    Register New Dealer
    Share Vehicle With Dealer    ${owner}    ${owner}[vehicle_id]    ${requester}[dealer_id]
    ${msg_id}=    Send Collaboration Message    ${requester}    ${owner}[vehicle_id]    ${owner}[dealer_id]    reserve_request

    ${stranger_headers}=    Auth Headers    ${stranger}[token]
    ${body}=    Create Dictionary    response=accepted    dealer_id=${stranger}[dealer_id]
    PATCH On Session    api    /collaborative/messages/${msg_id}/respond    json=${body}    headers=${stranger_headers}    expected_status=403

Dealer Sees The Incoming Request In Their Requests Inbox
    ${owner}=    Register New Dealer With Vehicle
    ${requester}=    Register New Dealer
    Share Vehicle With Dealer    ${owner}    ${owner}[vehicle_id]    ${requester}[dealer_id]
    Send Collaboration Message    ${requester}    ${owner}[vehicle_id]    ${owner}[dealer_id]    reserve_request

    ${owner_headers}=    Auth Headers    ${owner}[token]
    ${resp}=    GET On Session    api    /collaborative/dealer/${owner}[dealer_id]/incoming-requests    headers=${owner_headers}    expected_status=200
    ${vehicle_ids}=    Evaluate    [r['vehicle']['id'] for r in $resp.json() if r.get('vehicle')]
    List Should Contain Value    ${vehicle_ids}    ${owner}[vehicle_id]
