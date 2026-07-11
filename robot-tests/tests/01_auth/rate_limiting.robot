*** Settings ***
Documentation    1.2.5 / 1.2.6 — brute-force / registration-spam throttling.
...              Tagged 'slow' since it deliberately sends bursts of requests;
...              excluded from the default fast run (see run.sh) and run
...              separately or nightly.
Library          RequestsLibrary
Library          Collections
Library          ../../libraries/DataFactory.py
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Create API Session
Test Tags        auth    slow    rate-limit

*** Test Cases ***
Login Endpoint Throttles After Eight Attempts Per Minute
    [Documentation]    Sends 9 rapid login attempts with wrong credentials;
    ...    the 9th must be rejected with 429, proving the anti-brute-force
    ...    throttle (limit: 8/min on /auth/login) is actually wired up —
    ...    not just present in the code but unreachable due to a routing bug.
    ${body}=    Create Dictionary    email=throttle-test@dubaiauto-test.invalid    password=WrongPassword123
    ${statuses}=    Create List
    FOR    ${i}    IN RANGE    9
        ${resp}=    POST On Session    api    /auth/login    json=${body}    expected_status=any
        Append To List    ${statuses}    ${resp.status_code}
    END
    Log    Observed status codes: ${statuses}    console=True
    List Should Contain Value    ${statuses}    429
    ...    msg=Expected at least one 429 Too Many Requests among 9 rapid login attempts, got: ${statuses}

Register Endpoint Throttles After Five Attempts Per Minute
    [Documentation]    Limit: 5/min on /auth/register. Each call uses a unique
    ...    email (would otherwise 409 before ever reaching the throttle limit).
    ${statuses}=    Create List
    FOR    ${i}    IN RANGE    6
        ${email}=    Generate Test Email    throttle
        ${password}=    Generate Strong Password
        ${full_name}=    Generate Full Name
        ${body}=    Create Dictionary
        ...    email=${email}    password=${password}    full_name=${full_name}
        ${resp}=    POST On Session    api    /auth/register    json=${body}    expected_status=any
        Append To List    ${statuses}    ${resp.status_code}
    END
    Log    Observed status codes: ${statuses}    console=True
    List Should Contain Value    ${statuses}    429
    ...    msg=Expected at least one 429 Too Many Requests among 6 rapid register attempts, got: ${statuses}
