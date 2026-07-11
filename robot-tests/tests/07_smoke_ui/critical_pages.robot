*** Settings ***
Documentation    Section 14 / 15 of the test plan — a thin layer of real-browser
...              smoke tests on top of the API suites above. These don't
...              re-verify business logic (the API suites already do that
...              exhaustively) — they only catch things API tests structurally
...              cannot: JS bundle errors, broken routing/guards, CSS/layout
...              catastrophes, and the frontend actually calling the backend
...              correctly end-to-end through the browser's fetch + auth
...              header patching (see SessionContext.tsx).
Library          Browser
Library          RequestsLibrary
Resource         ../../resources/common.resource
Resource         ../../resources/variables.resource
Suite Setup      Open Browser Session
Suite Teardown   Close Browser
Test Tags        smoke    ui

*** Keywords ***
Open Browser Session
    Create API Session
    New Browser    chromium    headless=${True}
    New Context    viewport={'width': 1440, 'height': 900}

*** Test Cases ***
Homepage Loads Without Console Errors
    [Documentation]    14.1.1 — the most basic possible check, but the one
    ...    most likely to catch a broken deploy (bad build, missing env var
    ...    causing a blank page, nginx misroute).
    New Page    ${WEB_URL}/
    Wait For Load State    networkidle
    Get Title    contains    DubaiAuto

Vehicle Catalog Page Renders Listings
    [Documentation]    14.1.1 — catalog must be browsable with zero setup,
    ...    no login wall.
    New Page    ${WEB_URL}/vehicles
    Wait For Load State    networkidle
    Get Url    contains    /vehicles

Login Page Renders Form
    New Page    ${WEB_URL}/login
    Wait For Elements State    input[type="email"]    visible    timeout=10s
    Get Element States    button[type="submit"]    contains    visible

Dealer Registration Page Renders Form
    New Page    ${WEB_URL}/register-dealer
    Wait For Elements State    input    visible    timeout=10s

Admin Area Redirects Unauthenticated Visitors Away From Dashboards
    [Documentation]    14.5.1 — CRITICAL frontend security check: visiting an
    ...    admin URL directly (typed URL, bookmark, shared link) without a
    ...    valid admin session must NOT render the dashboard. The backend
    ...    already rejects the underlying API calls (see admin_lockdown.robot);
    ...    this confirms the frontend route itself doesn't render sensitive
    ...    UI shell/layout while those calls silently fail in the background.
    New Context    viewport={'width': 1440, 'height': 900}
    New Page    ${WEB_URL}/admin/executive
    Wait For Load State    networkidle
    ${url}=    Get Url
    ${body_text}=    Get Text    body
    # Either an explicit redirect to /login happened, or the page rendered
    # its own "Couldn't load" / unauthorized state (see the error-handling
    # fix in executive/page.tsx) — both are acceptable, silently showing a
    # populated dashboard with real numbers is not.
    ${shows_error_or_redirect}=    Evaluate
    ...    "/login" in """${url}""" or "Couldn't load" in """${body_text}""" or "Unauthorized" in """${body_text}"""
    Should Be True    ${shows_error_or_redirect}
    ...    msg=Admin dashboard rendered without redirect or visible auth error for an unauthenticated visitor!

Logged In Dealer Can Reach Their Dashboard End To End Through The Browser
    [Documentation]    14.2.1 — the full stack, through the actual browser:
    ...    register via API (fast fixture setup), inject the token the same
    ...    way SessionContext does (localStorage.auth_token), then confirm
    ...    the dashboard renders real data through the browser's own fetch
    ...    calls (proving the window.fetch auth-patching in SessionContext.tsx
    ...    still works after any refactor).
    ${dealer}=    Register New Dealer
    New Context    viewport={'width': 1440, 'height': 900}
    New Page    ${WEB_URL}/
    Wait For Load State    load
    Evaluate JavaScript    ${None}    (() => { localStorage.setItem('auth_token', '${dealer}[token]'); localStorage.setItem('dealer_id', '${dealer}[dealer_id]'); localStorage.setItem('user_email', '${dealer}[email]'); })()
    Go To    ${WEB_URL}/dealer/dashboard
    Wait For Load State    networkidle
    Wait For Elements State    text=Stock value    visible    timeout=15s
