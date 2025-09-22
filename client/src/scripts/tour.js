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

 
  // --- Resume logic: navigate to correct route before resuming ---
  function getCurrentRoute() {
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
  
  if (shouldResume && startStepIndex > 0 && startStepIndex < tour.steps.length) {
    resumeTourAtStep(startStepIndex, startRoute)
  } else {
    tour.start()
  }
}
