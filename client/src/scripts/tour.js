// Shepherd tour configuration for Teams Management
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

export function startAppTour(router) {
  const savedTourState = localStorage.getItem('tour-state')
  let shouldResume = false
  let startStepIndex = 0
  let startRoute = null
  let sampleTeamId = null
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
  tour.on('complete', () => {
    localStorage.removeItem('tour-state')
  })
  tour.on('cancel', () => {
    localStorage.removeItem('tour-state')
  })

  function withBackButton(buttons, tour) {
    if (!buttons.some((btn) => btn.action === tour.back)) {
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

 
  function getRouteObject() {
    if (router.currentRoute && router.currentRoute.value) {
      return router.currentRoute.value
    }
    return router.currentRoute
  }

  function getCurrentRoute() {
    const route = getRouteObject()
    return route && route.path ? route.path : '/'
  }

  function isNavigationDuplicated(error) {
    if (!error) {
      return false
    }
    return (
      error.name === 'NavigationDuplicated' ||
      error.message?.includes('Avoided redundant navigation') ||
      error.message?.includes('Navigation cancelled')
    )
  }

  function sleep(duration = 300) {
    return new Promise((resolve) => setTimeout(resolve, duration))
  }

  function waitForElement(target, timeout = 8000) {
    return new Promise((resolve) => {
      const start = Date.now()

      const check = () => {
        let element = null
        if (typeof target === 'function') {
          element = target()
        } else if (typeof target === 'string') {
          element = document.querySelector(target)
        } else if (target instanceof Element) {
          element = target
        }

        if (element) {
          resolve(element)
          return
        }

        if (timeout && Date.now() - start >= timeout) {
          resolve(null)
          return
        }

        requestAnimationFrame(check)
      }

      check()
    })
  }

  async function ensureOnRoute(target, waitTarget, options = {}) {
    const route = getRouteObject()
    let shouldNavigate = false

    if (target) {
      if (typeof target === 'string') {
        shouldNavigate = route?.path !== target
      } else if (typeof target === 'object') {
        const targetPath = target.path || route?.path
        const targetQuery = target.query || {}
        const currentQuery = route?.query || {}
        shouldNavigate = route?.path !== targetPath || JSON.stringify(currentQuery) !== JSON.stringify(targetQuery)
      }
    }

    if (shouldNavigate) {
      try {
        await router.push(target)
      } catch (error) {
        if (!isNavigationDuplicated(error)) {
          console.error('Tour navigation failed:', error)
        }
      }
      await sleep(options.afterNavigateDelay ?? 350)
    }

    if (waitTarget) {
      await waitForElement(waitTarget, options.waitTimeout)
    }
  }

  function captureSampleTeamIdFromDashboard() {
    const dashboardButton = document.querySelector('#tour-tasks-table [data-team-id]')
    if (dashboardButton) {
      sampleTeamId = dashboardButton.getAttribute('data-team-id')
    }
    return sampleTeamId
  }

  function findSampleTeamCard() {
    return document.querySelector('[data-team-title*="Sample Team" i]')
  }

  function captureSampleTeamId() {
    if (sampleTeamId) {
      return sampleTeamId
    }

    captureSampleTeamIdFromDashboard()
    if (sampleTeamId) {
      return sampleTeamId
    }

    const sampleCard = findSampleTeamCard()
    if (sampleCard && sampleCard.dataset.teamId) {
      sampleTeamId = sampleCard.dataset.teamId
    }

    return sampleTeamId
  }

  async function navigateToSampleTeam() {
    if (!sampleTeamId) {
      await ensureOnRoute('/home', '#tour-tasks-table')
      captureSampleTeamIdFromDashboard()
    }

    if (!sampleTeamId) {
      await ensureOnRoute('/teams', () => findSampleTeamCard())
      captureSampleTeamId()
    }

    if (sampleTeamId) {
      await ensureOnRoute(`/teams/${sampleTeamId}`, '#tour-team-header', { afterNavigateDelay: 500 })
    }
  }

  async function setTeamTab(tabValue, waitTarget) {
    await waitForElement('#tour-team-tabs')
    const route = getRouteObject()
    if (!route) {
      return
    }

    const currentQuery = route.query || {}
    if (currentQuery.tab !== tabValue) {
      const updatedQuery = { ...currentQuery, tab: tabValue }
      try {
        await router.push({ path: route.path, query: updatedQuery })
      } catch (error) {
        if (!isNavigationDuplicated(error)) {
          console.error('Failed to switch team tab:', error)
        }
      }
      await sleep(300)
    }

    if (waitTarget) {
      await waitForElement(waitTarget)
    }
  }

  function addTourSteps() {
    const exitButton = {
      text: 'Exit',
      action: tour.cancel,
      classes: 'shepherd-button-secondary',
    }

    const nextButton = {
      text: 'Next',
      action: tour.next,
      classes: 'shepherd-button-primary',
    }

    const finishButton = {
      text: 'Finish',
      action: tour.complete,
      classes: 'shepherd-button-primary',
    }

    tour.addStep({
      id: 'dashboard-intro',
      title: 'Welcome to your dashboard',
      text: [
        'This guided tour highlights the core areas you use to stay on top of tasks and collaborate with your teams.',
        'You can exit the tour at any time using the Exit button.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-dashboard-welcome') || document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await ensureOnRoute('/home', '#tour-dashboard-welcome')
      },
      buttons: [exitButton, nextButton],
    })

    tour.addStep({
      id: 'dashboard-stats',
      title: 'Track task status',
      text: [
        'These status cards summarize how many tasks are not started, pending, overdue, and completed so you always know where attention is needed.',
      ],
      attachTo: {
        element: () =>
          document.querySelector('#tour-task-stats') ||
          document.querySelector('#tour-dashboard-welcome') ||
          document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await ensureOnRoute('/home', '#tour-task-stats')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'dashboard-progress',
      title: 'Monitor progress at a glance',
      text: [
        'The progress overview displays completion rates and totals so you can quickly gauge momentum across all assigned work.',
      ],
      attachTo: {
        element: () =>
          document.querySelector('#tour-progress-overview') ||
          document.querySelector('#tour-task-stats') ||
          document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await ensureOnRoute('/home', '#tour-progress-overview')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'dashboard-filters',
      title: 'Fine-tune the task list',
      text: [
        'Use filters and sorting to focus on the work that matters most, whether that is urgent tasks, pending submissions, or items by due date.',
      ],
      attachTo: {
        element: () =>
          document.querySelector('#tour-task-filters') ||
          document.querySelector('#tour-tasks-table') ||
          document.body,
        on: 'left',
      },
      beforeShowPromise: async () => {
        await ensureOnRoute('/home', '#tour-task-filters')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'dashboard-table',
      title: 'Review your assignments',
      text: [
        'Every task appears here with key details, due dates, and whether it has already been submitted.',
        'Select a row to inspect the description and use the action buttons to jump into the team workspace.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-tasks-table') || document.body,
        on: 'top',
      },
      beforeShowPromise: async () => {
        await ensureOnRoute('/home', '#tour-tasks-table')
        captureSampleTeamIdFromDashboard()
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'dashboard-open-team',
      title: 'Open the team behind a task',
      text: [
        'Select the launch icon to open the team that owns this task. This keeps the workflow connected between your personal dashboard and the team space.',
      ],
      attachTo: {
        element: () =>
          document.querySelector('#tour-tasks-table [data-team-id]') ||
          document.querySelector('#tour-tasks-table') ||
          document.body,
        on: 'left',
      },
      beforeShowPromise: async () => {
        await ensureOnRoute('/home', () => document.querySelector('#tour-tasks-table [data-team-id]'))
        captureSampleTeamIdFromDashboard()
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'team-overview',
      title: 'Team workspace overview',
      text: [
        'Here you can see the team context, announcements, and shared tools that support the task you opened from the dashboard.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-team-header') || document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await navigateToSampleTeam()
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'team-tabs',
      title: 'Navigate team features',
      text: [
        'Use these tabs to switch between tasks, workflow documentation, announcements, members, and management tools.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-team-tabs') || document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await waitForElement('#tour-team-tabs')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'workflow-tab',
      title: 'Workflow hub',
      text: [
        'The Workflow tab documents how your team plans, reviews, and completes tasks. Open it whenever you need clarification on the process.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-workflow-tab') || document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await waitForElement('#tour-workflow-tab')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'workflow-content',
      title: 'Review the workflow steps',
      text: [
        'Each stage of your team’s process is outlined here so you know exactly how to progress a task from start to finish.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-workflow-view') || document.body,
        on: 'top',
      },
      beforeShowPromise: async () => {
        await setTeamTab('workflow', '#tour-workflow-view')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'delete-team-tab',
      title: 'Administrative controls',
      text: [
        'Admins can access the Delete Team tab when a sample space is no longer needed or after migrating work to a permanent team.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-delete-team-tab') || document.body,
        on: 'bottom',
      },
      beforeShowPromise: async () => {
        await waitForElement('#tour-delete-team-tab')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'delete-team-content',
      title: 'Delete the sample team safely',
      text: [
        'Review the checklist carefully before deleting a team. This area lists everything that will be removed and provides the confirmation you must complete to avoid accidental loss.',
      ],
      attachTo: {
        element: () => document.querySelector('#tour-delete-team-content') || document.body,
        on: 'top',
      },
      beforeShowPromise: async () => {
        await setTeamTab('delete-team', '#tour-delete-team-content')
      },
      buttons: withBackButton([exitButton, nextButton], tour),
    })

    tour.addStep({
      id: 'tour-complete',
      title: "You're ready to go",
      text: [
        'You now know how to move from your dashboard into a team workspace, follow its workflow, and retire a sample team when you are done experimenting.',
        'Explore the rest of the app with confidence, and run this tour again anytime from the help menu.',
      ],
      buttons: withBackButton([exitButton, finishButton], tour),
    })
  }

  // --- Resume logic: navigate to correct route before resuming ---
  async function resumeTourAtStep(stepIndex, route) {
    if (route && getCurrentRoute() !== route) {
      await ensureOnRoute(route, null, { afterNavigateDelay: 400 })
    }
    tour.start()
    tour.show(stepIndex)
  }

  addTourSteps()

  if (shouldResume && startStepIndex > 0 && startStepIndex < tour.steps.length) {
    resumeTourAtStep(startStepIndex, startRoute).catch((error) =>
      console.error('Failed to resume tour:', error),
    )
  } else {
    tour.start()
  }
}
