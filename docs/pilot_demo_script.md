# AutoApplyer Pilot Demo Script

This script provides a structured walkthrough for demonstrating AutoApplyer to DWP stakeholders, potential buyers, or pilot participants. Follow this flow to showcase key features and value propositions.

## Pre-Demo Setup

1. **Prepare Test Data**
   - Have a claimant profile ready to onboard
   - Ensure job search is configured
   - Have sample applications queued
   - Prepare staff dashboard with multiple claimants

2. **Check Environment**
   - All pages load correctly
   - Analytics are working (check browser console)
   - No error states visible

3. **Browser Setup**
   - Use Chrome or Firefox (best compatibility)
   - Have browser console open (for analytics verification)
   - Full screen browser window
   - Zoom level at 100%

## Demo Flow (30-45 minutes)

### 1. Introduction (2 minutes)

**Key Points to Cover:**
- AutoApplyer automates job search and application for Universal Credit claimants
- Reduces burden on claimants while maintaining compliance
- Provides transparency and audit trails for work coaches
- Built with privacy and accessibility in mind

**Screen**: Landing page or claimant dashboard

---

### 2. Claimant Onboarding (8-10 minutes)

**Start**: Navigate to `/onboarding` or start with a new claimant

**Demonstrate:**

**Step 1: Profile Information**
- Show form fields: email, name, phone, location
- Highlight accessibility: keyboard navigation, clear labels
- Point out validation and error handling

**Step 2: Skills & Experience**
- Experience summary textarea
- Notice period selection
- Right to work status
- Show how this feeds into job matching

**Step 3: Job Preferences**
- Select multiple job types (show how UI handles selections)
- Remote work preferences
- Maximum commute distance slider
- Minimum salary (optional)
- **Key Point**: These preferences directly control automation

**Step 4: Automation Settings**
- Toggle "Auto apply" on/off
- Show "Require manual review" option
- Set daily application cap
- **Key Point**: Claimant maintains control over automation level

**Complete Onboarding:**
- Show confirmation screen
- Review summary of settings
- Point out analytics tracking (mention this is privacy-safe)

**Takeaways:**
- ✅ User-friendly, step-by-step process
- ✅ Clear compliance messaging
- ✅ Claimant control over automation
- ✅ Privacy-focused (no sensitive data exposed)

---

### 3. Job Search and Automation (5-7 minutes)

**Navigate**: Show job search filters (can be part of dashboard or separate page)

**Demonstrate:**

**Job Search Configuration**
- Search query and location
- Platform selection (Indeed, Greenhouse, Lever)
- Remote preference filters
- Easy Apply filter
- **Key Point**: Granular control over job matching

**Automation Settings**
- Show auto-apply toggle
- Review required toggle
- Daily cap setting
- **Key Point**: Balanced automation with oversight

**Trigger Search** (if backend is connected):
- Show search results or queue
- Explain how matching works
- Point out compliance logging

**Takeaways:**
- ✅ Flexible search configuration
- ✅ Automation respects claimant preferences
- ✅ Compliance is automatic and transparent

---

### 4. Compliance Log and Activity (5 minutes)

**Navigate**: Claimant Dashboard → Activity Timeline

**Demonstrate:**

**Activity Timeline**
- Show recent application activity
- Point out timestamp, job title, company, status
- Show different statuses (applied, skipped, error)
- **Key Point**: Complete audit trail for work coach review

**Compliance Summary**
- Show progress toward weekly requirement
- Visual progress bar
- Clear "X of Y applications" messaging
- **Key Point**: Claimant can see compliance status in real-time

**Export Log** (if ExportLogDialog is accessible):
- Show export dialog
- CSV and JSON options
- Date range filtering
- Share with work coach options
- **Key Point**: Claimant has full visibility and control

**Takeaways:**
- ✅ Transparent compliance tracking
- ✅ Exportable logs for work coach meetings
- ✅ Clear progress indicators

---

### 5. Work Coach Dashboard (10-12 minutes)

**Navigate**: Switch to `/work-coach` view

**Demonstrate:**

**Overview Section**
- KPI cards: Total claimants, On track, At risk, Non compliant
- **Key Point**: At-a-glance status for entire caseload

**Claimant List**
- Show filter options (status, regime level, region, jobcentre)
- Show sort options (by activity, name, compliance status)
- Demonstrate filtering in action
- **Key Point**: Efficient caseload management

**Select a Claimant**
- Show claimant detail panel
- Quick stats: regime level, compliance status, applications this week
- Next appointment date
- **Key Point**: Quick access to key information

**Activity Log**
- Show full activity timeline for selected claimant
- Sortable by date
- Status badges (applied, skipped, error)
- Job details (title, company, platform)
- **Key Point**: Complete visibility into claimant activity

**Notes Section**
- Show where work coaches can add notes
- Explain workflow integration
- **Key Point**: Context preservation for appointments

**Export/Print Functions**
- Show export options for appointments
- Demonstrate print-friendly format
- **Key Point**: Ready for use in meetings

**Takeaways:**
- ✅ Efficient caseload management
- ✅ Quick access to compliance data
- ✅ Supports work coach workflow
- ✅ Reduces time spent on manual tracking

---

### 6. Central Reporting (DWP Dashboard) (5-7 minutes)

**Navigate**: `/dwp` view

**Demonstrate:**

**Regional Metrics**
- Total claimants in pilot
- Average applications per week
- Sanction rate (non-compliance rate)
- Average days to work (if available)
- **Key Point**: Aggregate metrics for program evaluation

**Filters**
- Region filter
- Jobcentre filter
- Time window (start/end dates)
- Show filtering in action
- **Key Point**: Flexible reporting at different levels

**Time Series Chart**
- Point out chart area (ready for charting library)
- Explain data structure (weekly summaries)
- **Key Point**: Trend analysis capability

**Pilot vs Control** (if available):
- Show comparison metrics
- Applications per week comparison
- Time to work comparison
- **Key Point**: Built-in evaluation metrics

**Takeaways:**
- ✅ Program-level insights
- ✅ Supports pilot evaluation
- ✅ Ready for scaling across regions

---

### 7. Q&A and Deep Dive (Remaining Time)

**Potential Questions and Answers:**

**Q: How is privacy protected?**
- A: No PII in analytics, pseudonymized IDs, claimant controls data visibility

**Q: What if a claimant wants to stop automation?**
- A: Can disable auto-apply at any time, or pause individual searches

**Q: How does this integrate with existing systems?**
- A: Exportable logs, API-ready, can integrate with Universal Credit systems

**Q: What about errors or job board changes?**
- A: Error logging is comprehensive, manual review option available

**Q: How is compliance verified?**
- A: Complete audit trail with timestamps, job details, and status for each application

**Q: Can claimants see what applications were submitted?**
- A: Yes, full activity log is visible to claimants in their dashboard

**Q: What analytics are collected?**
- A: Aggregate behavior metrics, no PII. See analytics_events.md for details.

---

### Closing Points

**Reiterate Value Propositions:**

1. **For Claimants:**
   - Reduces time spent on repetitive applications
   - Maintains compliance automatically
   - Clear visibility into progress
   - Control over automation level

2. **For Work Coaches:**
   - Time savings on compliance checking
   - Real-time visibility into claimant activity
   - Better preparation for appointments
   - Focus on high-value interactions

3. **For DWP:**
   - Program evaluation metrics
   - Scalable solution
   - Privacy-compliant analytics
   - Ready for pilot expansion

**Next Steps:**
- Provide access to demo environment (if available)
- Share documentation links
- Schedule follow-up for technical deep dive
- Discuss pilot participation criteria

---

## Tips for Effective Demo

1. **Keep it Real**: Use realistic scenarios, not contrived examples
2. **Address Concerns**: Proactively mention privacy, control, transparency
3. **Show Edge Cases**: Demonstrate error handling, empty states
4. **Highlight Accessibility**: Keyboard navigation, screen reader support
5. **Emphasize Compliance**: Show how every action is logged and auditable

## Technical Demonstrations (Optional)

If audience is technical:

- Show browser console analytics events
- Demonstrate responsive design (resize window)
- Show accessibility features (keyboard navigation)
- Point out code organization and maintainability
- Explain API integration points

## Post-Demo Follow-up

**Provide:**
- Link to documentation
- Demo environment credentials (if available)
- Contact information for technical questions
- Pilot participation information

---

**Demo Checklist**

- [ ] Test claimant onboarding flow
- [ ] Test job search configuration
- [ ] Verify compliance log displays correctly
- [ ] Test work coach dashboard filters
- [ ] Check DWP dashboard metrics
- [ ] Verify analytics are tracking
- [ ] Test responsive design on tablet/mobile
- [ ] Check browser console for errors
- [ ] Prepare answers to common questions

