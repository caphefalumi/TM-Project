// Shepherd tour configuration for Teams Management
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

export function startAppTour(router) {
  const savedTourState = localStorage.getItem('tour-state')
  let shouldResume = false
  let startStepIndex = 0
  let startRoute = null
  if (savedTourState) {
    try {
      const parsed = JSON.parse(savedTourState)
      if (
        typeof parsed === 'object' &&
        typeof parsed.step === 'number' &&
        typeof parsed.route === 'string'
      ) {
        startStepIndex = parsed.step
        startRoute = parsed.route
        shouldResume = true
      }
    } catch (e) {
      // fallback for old format (just a number)
      const parsed = parseInt(savedTourState, 10)
      if (!isNaN(parsed)) {
        startStepIndex = parsed
        shouldResume = true
      }
    }
  }
  const tour = new Shepherd.Tour({
    defaultStepOptions: {
      scrollTo: { behavior: 'smooth', block: 'center' },
      cancelIcon: { enabled: true },
      classes: 'shepherd-theme-arrows',
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 4,
    },
    useModalOverlay: true,
  })

  // Save current step and route to localStorage on show
  tour.on('show', () => {
    const stepIndex = tour.currentStep ? tour.steps.indexOf(tour.currentStep) : 0
    const route = getCurrentRoute()
    localStorage.setItem('tour-state', JSON.stringify({ step: stepIndex, route }))
  })
  // Remove from localStorage on complete/cancel
  tour.on('complete', () => {
    localStorage.removeItem('tour-state')
  })

  // Helper to add a back button to all steps except the first
  function withBackButton(buttons, tour) {
    if (!buttons.some((btn) => btn.action === tour.back)) {
      // Insert Back as the first button (except for the first step)
      return [
        {
          text: 'Previous',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        ...buttons,
      ]
    }
    return buttons
  }
  function waitForElement(selector, timeout = 5000) {
    if (!selector) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      const existing = document.querySelector(selector)
      if (existing) {
        resolve(existing)
        return
      }
      const start = Date.now()
      const timer = setInterval(() => {
        const element = document.querySelector(selector)
        if (element || Date.now() - start >= timeout) {
          clearInterval(timer)
          resolve(element)
        }
      }, 100)
    })
  }

  // --- Welcome & navigation intro ---
  tour.addStep({
    id: 'welcome',
    text: "👋 Welcome to Teams Management! Let's take a quick tour so you can start collaborating with confidence.",
    buttons: [
      {
        text: 'Skip tour',
        action: tour.complete,
        classes: 'shepherd-button-secondary',
      },
      {
        text: 'Start tour',
        action: tour.next,
        classes: 'shepherd-button-primary',
      },
    ],
  })

  tour.addStep({
    id: 'core-navigation',
    text: 'Your sidebar is the launchpad for Dashboard, Teams, and settings—hop back here whenever you need to switch focus.',
    attachTo: { element: '#tour-sidebar-nav', on: 'right' },
    beforeShowPromise: () => waitForElement('#tour-sidebar-nav'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  // --- Key action #1: create teams and tasks ---
  tour.addStep({
    id: 'go-to-teams',
    text: "Let's build your first workspace. Jump into the Teams hub to create Team ABC.",
    attachTo: { element: '#tour-sidebar-nav', on: 'right' },
    beforeShowPromise: () => waitForElement('#tour-sidebar-nav'),
    buttons: withBackButton(
      [
        {
          text: 'Open Teams hub',
          action: () => {
            router.push('/teams')
            setTimeout(() => tour.next(), 800)
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: "I'm already there",
          action: tour.next,
          classes: 'shepherd-button-secondary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'create-team-abc',
    text: 'Tap the + button to open the create form and spin up Team ABC with a clear title and description.',
    attachTo: { element: '#tour-create-team-button', on: 'left' },
    beforeShowPromise: () => waitForElement('#tour-create-team-button'),
    buttons: withBackButton(
      [
        {
          text: 'Open create team',
          action: () => {
            const button = document.querySelector('#tour-create-team-button')
            if (button) {
              button.click()
              setTimeout(() => tour.next(), 500)
            } else {
              tour.next()
            }
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: 'Form is open',
          action: tour.next,
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'team-form-abc',
    text: 'Name this workspace “Team ABC”, add a quick description, choose a category, and hit Create to save it.',
    attachTo: { element: '#tour-create-team-dialog', on: 'top' },
    beforeShowPromise: () => waitForElement('#tour-create-team-dialog'),
    buttons: withBackButton(
      [
        {
          text: 'Team ABC saved',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'create-subteam',
    text: 'Reopen the + button to add Team XYZ and see how easy it is to nest teams.',
    attachTo: { element: '#tour-create-team-button', on: 'left' },
    beforeShowPromise: () => waitForElement('#tour-create-team-button'),
    buttons: withBackButton(
      [
        {
          text: 'Open create team',
          action: () => {
            const button = document.querySelector('#tour-create-team-button')
            if (button) {
              button.click()
              setTimeout(() => tour.next(), 500)
            } else {
              tour.next()
            }
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: 'Form is open',
          action: tour.next,
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'subteam-parent',
    text: 'Select Team ABC as the parent, name this one “Team XYZ”, and save—now you have a sub-team ready for collaboration.',
    attachTo: { element: '#tour-parent-team-select', on: 'right' },
    beforeShowPromise: () => waitForElement('#tour-parent-team-select'),
    buttons: withBackButton(
      [
        {
          text: 'Team XYZ saved',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'team-search',
    text: 'Use the search and filters to jump straight to Team ABC, Team XYZ, or any other workspace as your list grows.',
    attachTo: { element: '#tour-team-search', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-team-search'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'team-card',
    text: 'Open Team ABC to start planning tasks and workflows inside the workspace.',
    attachTo: { element: '#tour-team-card', on: 'top' },
    beforeShowPromise: () => waitForElement('#tour-team-card'),
    buttons: withBackButton(
      [
        {
          text: 'Open Team ABC',
          action: () => {
            const cards = Array.from(document.querySelectorAll('#tour-team-card'))
            const abcCard =
              cards.find((card) => card.textContent && card.textContent.includes('Team ABC')) ||
              cards[0]
            if (abcCard) {
              abcCard.click()
              setTimeout(() => tour.next(), 800)
            } else {
              tour.next()
            }
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: 'Already inside',
          action: tour.next,
          classes: 'shepherd-button-secondary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'team-overview',
    text: 'This header keeps your Team ABC mission, category, and metrics in view while you work.',
    attachTo: { element: '#tour-team-header', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-team-header'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'team-tabs',
    text: 'Tabs let you bounce between Tasks, Workflow, Announcements, Members, Roles, and the Delete Team safeguards.',
    attachTo: { element: '#tour-team-tabs', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-team-tabs'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'team-task-actions',
    text: 'Click “Add New Tasks” to capture Team ABC’s first assignment. After saving here, repeat inside Team XYZ to add two starter tasks for that sub-team.',
    attachTo: { element: '#tour-team-actions', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-team-actions'),
    buttons: withBackButton(
      [
        {
          text: 'Add new task',
          action: () => {
            const addTaskButton = Array.from(
              document.querySelectorAll('#tour-team-actions button'),
            ).find((btn) => btn.textContent && btn.textContent.includes('Add New Tasks'))
            if (addTaskButton) {
              addTaskButton.click()
              setTimeout(() => tour.next(), 500)
            } else {
              tour.next()
            }
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: 'Dialog is open',
          action: tour.next,
          classes: 'shepherd-button-secondary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'task-dialog',
    text: 'Fill in titles, due dates, assignees, and tags, then publish your first Team ABC task. Use this same wizard to add the two starter tasks for Team XYZ.',
    attachTo: { element: '#tour-new-task-dialog', on: 'top' },
    beforeShowPromise: () => waitForElement('#tour-new-task-dialog'),
    buttons: withBackButton(
      [
        {
          text: 'Tasks created',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'workflow-tab',
    text: 'Switch to Workflow to visualise how every task lines up on the shared calendar.',
    attachTo: { element: '#tour-workflow-tab', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-workflow-tab'),
    buttons: withBackButton(
      [
        {
          text: 'View workflow',
          action: () => {
            const workflowTab = document.querySelector('#tour-workflow-tab')
            if (workflowTab) {
              workflowTab.click()
              setTimeout(() => tour.next(), 500)
            } else {
              tour.next()
            }
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: 'Already on workflow',
          action: tour.next,
          classes: 'shepherd-button-secondary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'workflow-view',
    text: 'The workflow board plots your Team ABC and Team XYZ tasks—toggle views, inspect cards, and keep work flowing.',
    attachTo: { element: '#tour-workflow-view', on: 'top' },
    beforeShowPromise: () => waitForElement('#tour-workflow-view'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'delete-team',
    text: 'When Team ABC has run its course, the Delete Team tab lists every sub-team and asks for final confirmation before removal.',
    attachTo: { element: '#tour-delete-team-tab', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-delete-team-tab'),
    buttons: withBackButton(
      [
        {
          text: 'Got it',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  // --- Progress & checklist ---
  tour.addStep({
    id: 'go-to-dashboard',
    text: 'Head back to your dashboard to celebrate progress and keep the momentum going.',
    attachTo: { element: '#tour-sidebar-nav', on: 'right' },
    beforeShowPromise: () => waitForElement('#tour-sidebar-nav'),
    buttons: withBackButton(
      [
        {
          text: 'Open dashboard',
          action: () => {
            router.push('/home')
            setTimeout(() => tour.next(), 800)
          },
          classes: 'shepherd-button-primary',
        },
        {
          text: "I'm on the dashboard",
          action: tour.next,
          classes: 'shepherd-button-secondary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'progress-checklist',
    text: "These status cards act like your onboarding checklist:\n✅ Completed profile setup\n✅ Created Team ABC and its first task\n✅ Added two starter tasks in Team XYZ\n⬜ Invite teammates from the Members tab\n⬜ Explore more settings when you're ready.",
    attachTo: { element: '#tour-task-stats', on: 'bottom' },
    beforeShowPromise: () => waitForElement('#tour-task-stats'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'dashboard-table',
    text: 'Use the task table to filter, sort, and jump straight into the team that owns any item—perfect for hopping between Team ABC and Team XYZ.',
    attachTo: { element: '#tour-tasks-table', on: 'top' },
    beforeShowPromise: () => waitForElement('#tour-tasks-table'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  // --- Support & completion ---
  tour.addStep({
    id: 'support',
    text: 'Need a refresher later? Tap Start Tour or open help to replay these steps, browse docs, or reach the support team.',
    attachTo: { element: '#tour-help-button', on: 'top' },
    beforeShowPromise: () => waitForElement('#tour-help-button'),
    buttons: withBackButton(
      [
        {
          text: 'Next',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
      tour,
    ),
  })

  tour.addStep({
    id: 'tour-complete',
    text: "🎉 You're all set! Keep creating teams, collaborate across workflows, track progress, and retire spaces when the mission is complete.",
    buttons: [
      {
        text: 'Start collaborating',
        action: tour.complete,
        classes: 'shepherd-button-primary',
      },
      {
        text: 'Replay tour',
        action: () => {
          localStorage.removeItem('tour-state')
          tour.cancel()
          setTimeout(() => {
            tour.start()
          }, 400)
        },
        classes: 'shepherd-button-secondary',
      },
    ],
  })

  // --- Resume logic: navigate to correct route before resuming ---
  function getCurrentRoute() {
    // Vue Router 3/4 compatible
    return router.currentRoute && router.currentRoute.value
      ? router.currentRoute.value.path
      : router.currentRoute.path
  }

  function resumeTourAtStep(stepIndex, route) {
    const currentRoute = getCurrentRoute()
    if (route && currentRoute !== route) {
      router.push(route)
      setTimeout(() => {
        tour.start()
        tour.show(stepIndex)
      }, 800)
    } else {
      tour.start()
      tour.show(stepIndex)
    }
  }

  // Start or resume the tour
  if (shouldResume && startStepIndex > 0 && startStepIndex < tour.steps.length) {
    resumeTourAtStep(startStepIndex, startRoute)
  } else {
    tour.start()
  }
}
