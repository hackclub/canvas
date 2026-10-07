# canvas todo list

- [x] sync projects to airtable
  - airtable has following fields:
    - Code URL: Git repository link
    - Playable URL: demo url
    - First Name: user's first name
    - Last Name: user's last name
    - Email: user's email
    - Screenshot: project banner uploaded by user
    - Description: project description uploaded by user
    - GitHub Username: user's github username if the user has github connected
    - Address (Line 1): user's address
    - Address (Line 2): user's address
    - City: user's address
    - State / Province: user's address
    - Country: user's address
    - ZIP / Postal Code: user's address
    - Birthday: user's birthdate
    - Optional - Override Hours Spent: hours spent override
    - Optional - Override Hours Spent Justification: justification for changing the hours spent
    - Justification - Hackatime Project Name(s) + Date Range(s): Comma-separated.
      For hackatime-project tracked from 7/20/2026 to 7/22/2026 and hackatime-project-2 tracked from 7/21/2026 to 7/23/2026, write as: hackatime-project 7/20/2026-7/22/2026, hackatime-project-2 7/21/2026-7/23/2026
    - Justification - Submitter Hackatime ID: hackatime ID of user
    - Justification - Special Technical Features: Features that the project has that justifies the number of hours spent on it. Should be human-written.
    - Justification - Deflation Justification: Explanation of why hours were deflated **if** they were deflated from what was originally claimed. Should be human-written.
    - Justification - Additional Justification: Additional information you want to convey to the spot-checker that doesn't fit in the other fields.
    - Canvas - Project ID: project ID from canvas
    - Canvas - User ID: user ID from canvas
  - projects should be thrown in the airtable whenever shipped and approved

- [ ] working shop
  - [ ] shop fulfillment dashboard for admins
  - [ ] allow ordering items to addresses from HCA i guess

- [ ] earn pixels for each hour coded
  - [ ] progress bar on app home page
  - [ ] streaks?

- [ ] finalize introduction setup thing
  - [ ] admin funnel graph for
    - signed in with hca
    - verified & eligible
    - hackatime linked
    - project created
    - drawn on canvas
    - project shipped
  - [ ] require verified & eligible to ship projects
    - drawing on the canvas is fine
    - usually people will be verified & eligible immediately, edge case it takes a week
      or they get rejected. dont communicate timelines to user, just say like
      "waiting on eligibility" or something
  - [ ] tutorial-ish thing
    - people get introduced to canvas during the current setup screen
    - after linking hackatime, they are immediately prompted to create a project
    - after that, they get 1 pixel as a reward and can now explore the website

- [x] track time-ly active users
  - daily active users
  - hourly active users
  - total users
  - [x] admin graphs dashboard for this data
    - date selector for admin graphs
    - graphs for daily active users over time (per day)
    - graphs for hourly active users over time (per hour)

- [ ] landing page

- [ ] security audit
  - make sure any admin routes are only accessible to admins
  - make absolutely sure any calls to PII can only be done by users themselves or if needed admins
  - make absolutely sure people cant get free pixels or bonus points
  - make sure people cant get shop items without bonus points
  - make sure people cant paint on the canvas without pixels
  - make sure everything is properly scoped
  - sort out vulnerabilities
  - rate limits

- [ ] finish docker container
  - it should host the nuxt app as well
