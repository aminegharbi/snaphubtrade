*** Settings ***
Documentation    Referral tracking — regression suite for the "refer a new dealer
...              or broker" feature, which was completely non-functional end to
...              end: referral_code was accepted by the DTO but never read, the
...              broker signup form silently dropped its own referral field, and
...              the frontend used inconsistent ref=/aff= param names that no
...              page ever actually read. Confirms the fix: a broker's
...              affiliate_code, submitted as referral_code on dealer, buyer, or
...              broker signup, now creates a real BrokerReferral row and is
...              reflected in that broker's stats.referrals_active count.
Library          RequestsLibrary
Library          Collections
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        referrals    functional

*** Keywords ***
Get Referrals Active Count
    [Arguments]    ${broker_id}    ${headers}
    ${resp}=    GET On Session    api    /broker/${broker_id}/stats    headers=${headers}    expected_status=200
    RETURN    ${resp.json()}[referrals_active]

*** Test Cases ***
Referring Broker Is Credited When A New Dealer Signs Up With Their Code
    [Tags]    critical
    ${broker}=    Register New Broker
    ${headers}=    Auth Headers    ${broker}[token]
    ${before}=    Get Referrals Active Count    ${broker}[broker_id]    ${headers}

    ${email}=    Generate Test Email    referred-dealer
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}    role=dealer
    ...    referral_code=${broker}[affiliate_code]
    POST On Session    api    /auth/register    json=${body}    expected_status=201

    ${after}=    Get Referrals Active Count    ${broker}[broker_id]    ${headers}
    ${expected}=    Evaluate    ${before} + 1
    Should Be Equal As Integers    ${after}    ${expected}

Referring Broker Is Credited When A New Buyer Signs Up With Their Code
    ${broker}=    Register New Broker
    ${headers}=    Auth Headers    ${broker}[token]
    ${before}=    Get Referrals Active Count    ${broker}[broker_id]    ${headers}

    ${email}=    Generate Test Email    referred-buyer
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}    role=buyer
    ...    referral_code=${broker}[affiliate_code]
    POST On Session    api    /auth/register    json=${body}    expected_status=201

    ${after}=    Get Referrals Active Count    ${broker}[broker_id]    ${headers}
    ${expected}=    Evaluate    ${before} + 1
    Should Be Equal As Integers    ${after}    ${expected}

Referring Broker Is Credited When Another Broker Signs Up With Their Code
    [Documentation]    This is the path that was most concretely broken: the
    ...    broker signup form has a "Referral code" field the person can type
    ...    into, but it was never included in the request body at all.
    [Tags]    critical
    ${referrer}=    Register New Broker
    ${headers}=    Auth Headers    ${referrer}[token]
    ${before}=    Get Referrals Active Count    ${referrer}[broker_id]    ${headers}

    ${email}=    Generate Test Email    referred-broker
    ${full_name}=    Generate Full Name
    ${phone}=    Generate Phone Number
    ${password}=    Generate Strong Password
    ${body}=    Create Dictionary
    ...    full_name=${full_name}    email=${email}    phone=${phone}    password=${password}
    ...    referral_code=${referrer}[affiliate_code]
    POST On Session    api    /broker/register    json=${body}    expected_status=201

    ${after}=    Get Referrals Active Count    ${referrer}[broker_id]    ${headers}
    ${expected}=    Evaluate    ${before} + 1
    Should Be Equal As Integers    ${after}    ${expected}

An Unknown Referral Code Never Blocks Signup
    [Documentation]    A mistyped or stale referral link must never prevent
    ...    someone from creating an account — it should just not credit anyone.
    ${email}=    Generate Test Email    bad-ref-dealer
    ${password}=    Generate Strong Password
    ${full_name}=    Generate Full Name
    ${body}=    Create Dictionary
    ...    email=${email}    password=${password}    full_name=${full_name}    role=dealer
    ...    referral_code=DOES-NOT-EXIST-CODE
    POST On Session    api    /auth/register    json=${body}    expected_status=201

Signup Without A Referral Code Still Works And Credits No One
    ${broker}=    Register New Broker
    ${headers}=    Auth Headers    ${broker}[token]
    ${before}=    Get Referrals Active Count    ${broker}[broker_id]    ${headers}

    ${dealer}=    Register New Dealer

    ${after}=    Get Referrals Active Count    ${broker}[broker_id]    ${headers}
    Should Be Equal As Integers    ${after}    ${before}
