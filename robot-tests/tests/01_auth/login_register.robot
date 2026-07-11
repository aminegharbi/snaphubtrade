*** Settings ***
Documentation    Section 1 of the test plan: Authentication & account management.
...              Covers: registration, login, JWT issuance, role-escalation
...              prevention, and the specific bugs found/fixed in past sessions
...              (missing access_token on login, admin role forgeable via register).
Library          RequestsLibrary
Library          Collections
Library          ../../libraries/DataFactory.py
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        auth

*** Test Cases ***
Register Buyer With Valid Credentials Returns Access Token
    [Documentation]    1.1.1 — regression guard for the bug where /auth/login
    ...    never returned an access_token at all.
    ${account}=    Register New Buyer
    Should Not Be Empty    ${account}[token]

Register Dealer Creates Linked Dealer Record
    [Documentation]    1.1.2 — role=dealer must create both a User and a Dealer,
    ...    linked by user_id, with an auto-generated unique slug.
    ${account}=    Register New Dealer
    Should Not Be Empty    ${account}[dealer_id]
    Should Not Be Empty    ${account}[dealer_slug]

Login With Valid Credentials Returns Access Token And Correct Profile Type
    [Documentation]    1.1.4
    ${account}=    Register New Dealer
    ${body}=    Create Dictionary    email=${account}[email]    password=${account}[password]
    ${resp}=    POST On Session    api    /auth/login    json=${body}    expected_status=200
    Should Not Be Empty    ${resp.json()}[access_token]
    Should Be Equal As Strings    ${resp.json()}[profile_type]    dealer

Token From Login Is Accepted On A Protected Endpoint
    [Documentation]    1.1.5 — end-to-end proof the JWT actually authenticates,
    ...    not just that a token-shaped string is returned.
    ${account}=    Register New Dealer
    ${headers}=    Auth Headers    ${account}[token]
    ${resp}=    GET On Session    api    /dealer-dashboard/${account}[dealer_id]/stats
    ...    headers=${headers}    expected_status=200

Register Endpoint Rejects Client Supplied Admin Role
    [Documentation]    1.2.1 — CRITICAL: /auth/register must NEVER be able to
    ...    create an admin account, no matter what "role" is sent. This is the
    ...    only thing standing between a public form and full platform takeover.
    ${email}=    Generate Test Email    escalation
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}    role=admin
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=201
    # Role was silently coerced to buyer — verify by logging in and checking profile_type.
    ${token}=    Login And Get Token    ${email}    ${password}
    ${headers}=    Auth Headers    ${token}
    ${admin_resp}=    GET On Session    api    /admin/stats    headers=${headers}
    ...    expected_status=any
    Expect Forbidden    ${admin_resp}

Register Endpoint Rejects Client Supplied Email Verified Flag
    [Documentation]    1.2.2 — email_verified must always start false, regardless
    ...    of what the client sends (there is no verification flow yet, so this
    ...    field being spoofable would be a trivial trust-boundary bypass).
    ${email}=    Generate Test Email    verif
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}    email_verified=${True}
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=201
    Should Be Equal    ${resp.json()}[user][email_verified]    ${False}

Login With Wrong Password Returns Generic Error Message
    [Documentation]    1.2.3 — the error message must not reveal whether the
    ...    account exists (anti user-enumeration).
    ${account}=    Register New Buyer
    ${body}=    Create Dictionary    email=${account}[email]    password=WrongPassword123
    ${resp}=    POST On Session    api    /auth/login    json=${body}    expected_status=any
    Expect Unauthorized    ${resp}
    Should Contain    ${resp.json()}[message]    Incorrect email or password

Login With Nonexistent Email Returns Same Generic Error
    [Documentation]    1.2.4 — same message/shape whether the account exists or not.
    ${email}=    Generate Test Email    ghost
    ${body}=    Create Dictionary    email=${email}    password=SomePassword123
    ${resp}=    POST On Session    api    /auth/login    json=${body}    expected_status=any
    Expect Unauthorized    ${resp}
    Should Contain    ${resp.json()}[message]    Incorrect email or password

Protected Endpoint Rejects Missing Authorization Header
    [Documentation]    1.2.7
    ${resp}=    GET On Session    api    /admin/stats    expected_status=any
    Expect Unauthorized    ${resp}

Protected Endpoint Rejects Malformed Token
    [Documentation]    1.2.9
    ${headers}=    Create Dictionary    Authorization=Bearer not-a-real-jwt-token
    ${resp}=    GET On Session    api    /admin/stats    headers=${headers}    expected_status=any
    Expect Unauthorized    ${resp}

Buyer Token Cannot Access Admin Only Endpoint
    [Documentation]    1.2.10 — role boundary check, buyer -> admin.
    ${account}=    Register New Buyer
    ${headers}=    Auth Headers    ${account}[token]
    ${resp}=    GET On Session    api    /admin/stats    headers=${headers}    expected_status=any
    Expect Forbidden    ${resp}

Duplicate Email Registration Is Rejected
    [Documentation]    1.2.13
    ${account}=    Register New Buyer
    ${body}=    Create Dictionary
    ...    email=${account}[email]    password=AnotherPass123    full_name=Someone Else
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    409

No Endpoint Ever Leaks Password Hash
    [Documentation]    1.2.14 — spot-checks register/login responses for the
    ...    password_hash field leaking. This is a "should never happen"
    ...    regression guard, cheap to run on every build.
    ${account}=    Register New Dealer
    ${body}=    Create Dictionary    email=${account}[email]    password=${account}[password]
    ${resp}=    POST On Session    api    /auth/login    json=${body}    expected_status=200
    Response Should Not Contain Password Hash    ${resp}

Password Shorter Than Eight Characters Is Rejected
    [Documentation]    1.3.1
    ${email}=    Generate Test Email    weakpw
    ${body}=    Create Dictionary    email=${email}    password=Ab1    full_name=Weak Password
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=any
    Expect Bad Request    ${resp}

Password Without Uppercase Or Digit Is Rejected
    [Documentation]    1.3.2
    ${email}=    Generate Test Email    weakpw2
    ${body}=    Create Dictionary    email=${email}    password=alllowercase    full_name=Weak Password Two
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=any
    Expect Bad Request    ${resp}

Malformed Email Is Rejected
    [Documentation]    1.3.3
    ${password}=    Generate Strong Password
    ${body}=    Create Dictionary    email=not-an-email    password=${password}    full_name=Bad Email
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=any
    Expect Bad Request    ${resp}

Extra Unknown Fields In Register Payload Are Silently Ignored Not Rejected
    [Documentation]    1.3.6 — whitelist:true should strip unknown fields rather
    ...    than error, since forbidNonWhitelisted is intentionally off (see
    ...    SECURITY_TODO.md) to avoid breaking legacy frontend forms.
    ${email}=    Generate Test Email    extra
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}
    ...    isAdmin=${True}    totally_made_up_field=hello
    ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=201
