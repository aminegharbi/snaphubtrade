*** Settings ***
Documentation    Functional (non-security) checks for the dealer profile
...              lifecycle — sections 2.1 / 2.3 of the test plan.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        dealers    functional

*** Test Cases ***
Public Can List Dealers Without Authentication
    [Documentation]    2.1.1
    ${resp}=    GET On Session    api    /dealers    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    items

Public Can View A Dealer Profile By Slug
    [Documentation]    2.1.2
    ${dealer}=    Register New Dealer
    ${resp}=    GET On Session    api    /dealers/${dealer}[dealer_slug]    expected_status=200
    Should Be Equal    ${resp.json()}[id]    ${dealer}[dealer_id]

Public Can View Dealer Stats And Reviews
    [Documentation]    2.1.3
    ${dealer}=    Register New Dealer
    GET On Session    api    /dealers/${dealer}[dealer_id]/stats    expected_status=200
    GET On Session    api    /dealers/${dealer}[dealer_id]/reviews    expected_status=200
    GET On Session    api    /dealers/${dealer}[dealer_id]/trust-score    expected_status=200

Dealer Can Update Their Own Profile
    [Documentation]    2.1.4
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    description=Updated by Robot Framework QA suite
    ${resp}=    PUT On Session    api    /dealers/${dealer}[dealer_id]
    ...    json=${body}    headers=${headers}    expected_status=200
    Should Be Equal    ${resp.json()}[description]    Updated by Robot Framework QA suite

Buyer Can Leave A Review And Rating Aggregate Updates
    [Documentation]    2.1.5 / 2.1.6
    ${dealer}=    Register New Dealer
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${body}=    Create Dictionary    rating=5    comment=Excellent service, highly recommend.
    ${resp}=    POST On Session    api    /dealers/${dealer}[dealer_id]/reviews
    ...    json=${body}    headers=${headers}    expected_status=201
    ${dealer_check}=    GET On Session    api    /dealers/${dealer}[dealer_slug]    expected_status=200
    Should Be True    ${dealer_check.json()}[review_count] >= 1

Nonexistent Dealer Slug Returns Clean 404
    [Documentation]    2.3.1
    ${resp}=    GET On Session    api    /dealers/this-slug-does-not-exist-qa    expected_status=any
    Expect Not Found    ${resp}

Invalid Logo Url Is Rejected
    [Documentation]    2.3.2
    ${dealer}=    Register New Dealer
    ${headers}=    Auth Headers    ${dealer}[token]
    ${body}=    Create Dictionary    logo_url=not-a-url
    ${resp}=    PUT On Session    api    /dealers/${dealer}[dealer_id]
    ...    json=${body}    headers=${headers}    expected_status=any
    Expect Bad Request    ${resp}

Review Comment Over Limit Is Rejected
    [Documentation]    2.3.3 — DTO caps comment at 1000 chars.
    ${dealer}=    Register New Dealer
    ${buyer}=    Register New Buyer
    ${headers}=    Auth Headers    ${buyer}[token]
    ${long_comment}=    Evaluate    "x" * 1500
    ${body}=    Create Dictionary    rating=4    comment=${long_comment}
    ${resp}=    POST On Session    api    /dealers/${dealer}[dealer_id]/reviews
    ...    json=${body}    headers=${headers}    expected_status=any
    Expect Bad Request    ${resp}
