*** Settings ***
Documentation    Buyer request lifecycle — a website visitor sends a "Request
...              this vehicle" inquiry (public POST /crm/leads), the dealer
...              sees it in their inbox (/leads/dealer/:id) and can Accept,
...              Counter, Reject, Reopen, Contact and annotate it. Also locks
...              down the anti-IDOR boundary: dealer B can never see or act on
...              dealer A's requests, buyers/anonymous get 401/403.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        leads    functional

*** Test Cases ***
Public Visitor Can Submit A Vehicle Request Without An Account
    [Documentation]    The buyer-facing entry point is public by design —
    ...    requiring login would kill conversion. Regression pin for the
    ...    original "404 on request a car" bug.
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]    offer_price=250000
    Should Not Be Empty    ${lead_id}

Request Without Buyer Contact Is Rejected With 400
    [Documentation]    A request must carry a name and at least one contact
    ...    channel — otherwise the dealer can never respond.
    ${dealer}=    Register New Dealer With Vehicle
    ${body}=    Create Dictionary    dealer_id=${dealer}[dealer_id]
    ${resp}=    POST On Session    api    /crm/leads    json=${body}    expected_status=400

Request For Unknown Dealer Is Rejected With 404
    ${name}=    Generate Full Name
    ${email}=    Generate Test Email    buyer
    ${body}=    Create Dictionary
    ...    dealer_id=nonexistent-dealer-id    buyer_name=${name}    buyer_email=${email}
    ${resp}=    POST On Session    api    /crm/leads    json=${body}    expected_status=404

Request For A Vehicle Belonging To Another Dealer Is Rejected
    [Documentation]    vehicle_id must belong to dealer_id — otherwise a lead
    ...    could be attached to the wrong dealer's inventory.
    ${dealer_a}=    Register New Dealer With Vehicle
    ${dealer_b}=    Register New Dealer
    ${name}=    Generate Full Name
    ${email}=    Generate Test Email    buyer
    ${body}=    Create Dictionary
    ...    dealer_id=${dealer_b}[dealer_id]    vehicle_id=${dealer_a}[vehicle_id]
    ...    buyer_name=${name}    buyer_email=${email}
    ${resp}=    POST On Session    api    /crm/leads    json=${body}    expected_status=404

Dealer Sees The New Request In Their Inbox With Pending Status
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]    headers=${headers}    expected_status=200
    Should Be True    ${resp.json()}[pending_action] >= 1
    ${ids}=    Evaluate    [l['id'] for l in $resp.json()['leads']]
    List Should Contain Value    ${ids}    ${lead_id}

Dealer Can View Request Detail With Timeline
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${resp}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    activities
    Should Be Equal    ${resp.json()}[dealer_id]    ${dealer}[dealer_id]
    ${types}=    Evaluate    [a['type'] for a in $resp.json()['activities']]
    List Should Contain Value    ${types}    created

Dealer Can Accept A Request
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]    offer_price=240000
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    note=Deal — see you Saturday
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/accept
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Be Equal    ${resp.json()}[dealer_decision]    accepted
    Should Be Equal    ${resp.json()}[stage]    negotiating

Accepting The Same Request Twice Is Rejected
    [Documentation]    Double-decision guard — the buyer must never receive two
    ...    contradictory confirmation emails for the same request.
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${empty}=    Create Dictionary
    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/accept
    ...    json=${empty}    headers=${headers}    expected_status=201
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/accept
    ...    json=${empty}    headers=${headers}    expected_status=400

Dealer Can Send A Counter Offer
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]    offer_price=230000
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    price=${262000}    note=Best I can do with the warranty included
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/counter
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Be Equal    ${resp.json()}[dealer_decision]    countered
    Should Be Equal As Numbers    ${resp.json()}[dealer_counter_price]    262000
    # The buyer's original ask must be preserved untouched next to the counter.
    Should Be Equal As Numbers    ${resp.json()}[offer_price]    230000

Counter Offer Without A Valid Price Is Rejected
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    price=${0}
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/counter
    ...    json=${body}    headers=${headers}    expected_status=400

Dealer Can Reject A Request
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    note=Vehicle already reserved
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/reject
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Be Equal    ${resp.json()}[dealer_decision]    rejected
    Should Be Equal    ${resp.json()}[stage]    lost

Dealer Can Reopen A Decided Request And Decide Again
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${empty}=    Create Dictionary
    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/reject
    ...    json=${empty}    headers=${headers}    expected_status=201
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/reopen
    ...    json=${empty}    headers=${headers}    expected_status=201
    Should Be Equal    ${resp.json()['dealer_decision']}    ${None}
    Should Be Equal    ${resp.json()}[stage]    new
    # After reopening, a different decision must be possible.
    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/accept
    ...    json=${empty}    headers=${headers}    expected_status=201

Contacting Via WhatsApp Returns A Prefilled Deep Link And Logs The Touchpoint
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    channel=whatsapp
    ${resp}=    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/contact
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Be True    ${resp.json()}[logged]
    Should Contain    ${resp.json()}[deep_link]    wa.me
    # First contact moves a fresh lead from 'new' to 'contacted'.
    ${detail}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}    headers=${headers}    expected_status=200
    Should Be Equal    ${detail.json()}[stage]    contacted
    ${types}=    Evaluate    [a['type'] for a in $detail.json()['activities']]
    List Should Contain Value    ${types}    contact_whatsapp

Dealer Can Add A Free Form Note To The Timeline
    ${dealer}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    note=Client wants delivery to Abu Dhabi
    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}/notes
    ...    json=${body}    headers=${headers}    expected_status=201
    ${detail}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]/${lead_id}    headers=${headers}    expected_status=200
    ${notes}=    Evaluate    [a['note'] for a in $detail.json()['activities'] if a['type'] == 'note']
    List Should Contain Value    ${notes}    Client wants delivery to Abu Dhabi

Decision Filter Returns Only Matching Requests
    ${dealer}=    Register New Dealer With Vehicle
    ${accepted_id}=    Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${pending_id}=     Create Buyer Request    ${dealer}[dealer_id]    ${dealer}[vehicle_id]
    ${headers}=    Auth Headers    ${dealer}[token]
    ${empty}=    Create Dictionary
    POST On Session    api    /leads/dealer/${dealer}[dealer_id]/${accepted_id}/accept
    ...    json=${empty}    headers=${headers}    expected_status=201
    ${resp}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]    headers=${headers}
    ...    params=decision=accepted    expected_status=200
    ${ids}=    Evaluate    [l['id'] for l in $resp.json()['leads']]
    List Should Contain Value        ${ids}    ${accepted_id}
    List Should Not Contain Value    ${ids}    ${pending_id}

# ── Security boundary ───────────────────────────────────────────────────────
Anonymous Cannot Read A Dealer Request Inbox
    [Tags]    security
    ${dealer}=    Register New Dealer With Vehicle
    ${resp}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]    expected_status=401

Buyer Role Cannot Read A Dealer Request Inbox
    [Tags]    security
    ${dealer}=    Register New Dealer With Vehicle
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${resp}=    GET On Session    api    /leads/dealer/${dealer}[dealer_id]    headers=${headers}    expected_status=403

Dealer B Cannot Read Or Act On Dealer A Requests
    [Tags]    security    idor
    ${dealer_a}=    Register New Dealer With Vehicle
    ${lead_id}=    Create Buyer Request    ${dealer_a}[dealer_id]    ${dealer_a}[vehicle_id]
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    # Read the inbox of A as B → 403
    ${r1}=    GET On Session    api    /leads/dealer/${dealer_a}[dealer_id]    headers=${headers_b}    expected_status=403
    # Act on A's lead through B's own scope → the lead lookup must refuse
    ${empty}=    Create Dictionary
    ${r2}=    POST On Session    api    /leads/dealer/${dealer_b}[dealer_id]/${lead_id}/accept
    ...    json=${empty}    headers=${headers_b}    expected_status=403
    # Act on A's lead through A's scope with B's token → scope check refuses first
    ${r3}=    POST On Session    api    /leads/dealer/${dealer_a}[dealer_id]/${lead_id}/accept
    ...    json=${empty}    headers=${headers_b}    expected_status=403
