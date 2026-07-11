*** Settings ***
Documentation    Section covering the admin dealer/broker/user management
...              endpoints added after "on ne peut pas modifier le profil,
...              mot de passe ou les données d'un dealer/broker" — this suite
...              pins that capability so it doesn't silently regress again.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        admin

*** Test Cases ***
Admin Can List All Dealers
    ${token}=    Get Admin Token
    ${headers}=    Auth Headers    ${token}
    ${resp}=    GET On Session    api    /admin/dealers    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

Admin Can Update Any Dealer Profile
    ${admin_token}=    Get Admin Token
    ${admin_headers}=    Auth Headers    ${admin_token}
    ${dealer}=    Register New Dealer
    ${body}=    Create Dictionary    company_name=Updated By Admin QA
    ${resp}=    PATCH On Session    api    /admin/dealers/${dealer}[dealer_id]
    ...    json=${body}    headers=${admin_headers}    expected_status=200
    Should Be Equal    ${resp.json()}[company_name]    Updated By Admin QA

Admin Can Verify A Dealer
    [Documentation]    The specific field a dealer can never set on themself,
    ...    confirming the admin-only path works.
    ${admin_token}=    Get Admin Token
    ${admin_headers}=    Auth Headers    ${admin_token}
    ${dealer}=    Register New Dealer
    ${body}=    Create Dictionary    verified=${True}
    ${resp}=    PATCH On Session    api    /admin/dealers/${dealer}[dealer_id]
    ...    json=${body}    headers=${admin_headers}    expected_status=200
    Should Be Equal    ${resp.json()}[verified]    ${True}

Admin Can List All Brokers
    ${token}=    Get Admin Token
    ${headers}=    Auth Headers    ${token}
    ${resp}=    GET On Session    api    /admin/brokers    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${resp.json()}    items

Admin Can Update Broker Tier And Commission Rate
    ${admin_token}=    Get Admin Token
    ${admin_headers}=    Auth Headers    ${admin_token}
    ${broker}=    Register New Broker
    ${body}=    Create Dictionary    tier=Gold    commission_rate=${0.025}
    ${resp}=    PATCH On Session    api    /admin/brokers/${broker}[broker_id]
    ...    json=${body}    headers=${admin_headers}    expected_status=200
    Should Be Equal    ${resp.json()}[tier]    Gold

Admin Can Reset A Dealer User Password
    [Documentation]    End-to-end: reset the password, then log in with the
    ...    NEW password (proving the hash actually changed) and confirm the
    ...    OLD password no longer works.
    ${admin_token}=    Get Admin Token
    ${admin_headers}=    Auth Headers    ${admin_token}
    ${dealer}=    Register New Dealer
    ${new_password}=    Generate Strong Password
    ${body}=    Create Dictionary    new_password=${new_password}
    ${resp}=    POST On Session    api    /admin/users/${dealer}[user_id]/reset-password
    ...    json=${body}    headers=${admin_headers}    expected_status=200

    ${new_login}=    Create Dictionary    email=${dealer}[email]    password=${new_password}
    ${new_resp}=    POST On Session    api    /auth/login    json=${new_login}    expected_status=200

    ${old_login}=    Create Dictionary    email=${dealer}[email]    password=${dealer}[password]
    ${old_resp}=    POST On Session    api    /auth/login    json=${old_login}    expected_status=any
    Expect Unauthorized    ${old_resp}

Non Admin Cannot Reset Any Password
    [Documentation]    CRITICAL — password reset must be the most tightly
    ...    guarded admin capability of all.
    ${dealer_a}=    Register New Dealer
    ${dealer_b}=    Register New Dealer
    ${headers_b}=    Auth Headers    ${dealer_b}[token]
    ${body}=    Create Dictionary    new_password=Hacked1234Password
    ${resp}=    POST On Session    api    /admin/users/${dealer_a}[user_id]/reset-password
    ...    json=${body}    headers=${headers_b}    expected_status=any
    Expect Forbidden    ${resp}

Admin Reset Password Rejects Weak Password
    ${admin_token}=    Get Admin Token
    ${admin_headers}=    Auth Headers    ${admin_token}
    ${dealer}=    Register New Dealer
    ${body}=    Create Dictionary    new_password=weak
    ${resp}=    POST On Session    api    /admin/users/${dealer}[user_id]/reset-password
    ...    json=${body}    headers=${admin_headers}    expected_status=any
    Expect Bad Request    ${resp}

Admin Update User Cannot Set Password Hash Directly
    [Documentation]    Regression guard for the DTO whitelist: password_hash
    ...    must not be settable via the generic user-update endpoint, only
    ...    through the dedicated reset-password endpoint.
    ${admin_token}=    Get Admin Token
    ${admin_headers}=    Auth Headers    ${admin_token}
    ${dealer}=    Register New Dealer
    ${body}=    Create Dictionary    password_hash=not-a-real-bcrypt-hash
    ${resp}=    PATCH On Session    api    /admin/users/${dealer}[user_id]
    ...    json=${body}    headers=${admin_headers}    expected_status=200
    # The old password must still work — proves password_hash was stripped,
    # not actually overwritten with garbage.
    ${login}=    Create Dictionary    email=${dealer}[email]    password=${dealer}[password]
    ${login_resp}=    POST On Session    api    /auth/login    json=${login}    expected_status=200
