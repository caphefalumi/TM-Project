// Shepherd tour configuration for Teams Management
import Shepherd from "shepherd.js"
import "shepherd.js/dist/css/shepherd.css"

export function startAppTour(router) {
	const savedTourState = localStorage.getItem("tour-state")
	let shouldResume = false
	let startStepIndex = 0
	let startRoute = null
	if (savedTourState) {
		try {
			const parsed = JSON.parse(savedTourState)
			if (
				typeof parsed === "object" &&
				typeof parsed.step === "number" &&
				typeof parsed.route === "string"
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
			scrollTo: { behavior: "smooth", block: "center" },
			cancelIcon: { enabled: true },
			classes: "shepherd-theme-arrows",
			modalOverlayOpeningPadding: 8,
			modalOverlayOpeningRadius: 4,
		},
		useModalOverlay: true,
	})

	// Save current step and route to localStorage on show
	tour.on("show", () => {
		const stepIndex = tour.currentStep
			? tour.steps.indexOf(tour.currentStep)
			: 0
		const route = getCurrentRoute()
		localStorage.setItem(
			"tour-state",
			JSON.stringify({ step: stepIndex, route })
		)
	})
	// Remove from localStorage on complete/cancel
	tour.on("complete", () => {
		localStorage.removeItem("tour-state")
	})

	// Helper to add a back button to all steps except the first
	function withBackButton(buttons, tour) {
		if (!buttons.some(btn => btn.action === tour.back)) {
			// Insert Back as the first button (except for the first step)
			return [
				{
					text: "Previous",
					action: tour.back,
					classes: "shepherd-button-secondary",
				},
				...buttons,
			]
		}
		return buttons
	}
	// --- Welcome Step ---
	tour.addStep({
		id: "welcome",
		text: "🎉 Welcome to Teams Management! Ready for a quick tour of our powerful collaboration platform?",
		buttons: [
			{
				text: "Skip Tour",
				action: tour.complete,
				classes: "shepherd-button-secondary",
			},
			{ text: "Let's Go!", action: tour.next },
		],
	})

	// --- Main Navigation & Header ---
	tour.addStep({
		id: "app-header",
		text: "📱 Your command center: navigation, notifications, and quick actions all in one place.",
		attachTo: { element: "#tour-app-header", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "notification-center",
		text: "🔔 Stay in the loop! All team updates, task assignments, and announcements land here.",
		attachTo: { element: "#tour-notification-center", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "sidebar-navigation",
		text: "🧭 Your navigation hub: Dashboard, Teams, and Admin tools (if you're an admin).",
		attachTo: { element: "#tour-sidebar-nav", on: "right" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	// --- Dashboard Overview ---
	tour.addStep({
		id: "dashboard-welcome",
		text: "🏠 Your personal command center! Everything you need to stay on top of your work.",
		attachTo: { element: "#tour-dashboard-welcome", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "task-statistics",
		text: "📊 Quick stats at a glance: Total, Completed, Pending, and Overdue tasks.",
		attachTo: { element: "#tour-task-stats", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "progress-overview",
		text: "📈 Visual progress tracking - see how you're crushing those tasks!",
		attachTo: { element: "#tour-progress-overview", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "tasks-table",
		text: "📋 Your complete task list with filtering, sorting, and all the details you need.",
		attachTo: { element: "#tour-tasks-table", on: "top" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "task-filters",
		text: "🔍 Smart filters to find exactly what you're looking for - by status, priority, or dates.",
		attachTo: { element: "#tour-task-filters", on: "bottom" },
		buttons: withBackButton(
			[
				{
					text: "Go to Teams",
					action: () => {
						router.push("/teams")
						setTimeout(() => tour.next(), 800)
					},
				},
			],
			tour
		),
	})

	// --- Teams Overview ---
	tour.addStep({
		id: "teams-overview",
		text: "👥 Team central! View, create, and manage all your teams from this hub.",
		attachTo: { element: "#tour-teams-overview", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "team-management-options",
		text: "⚡ Quick actions: Create new teams or manage existing ones with admin privileges.",
		attachTo: { element: "#tour-team-options", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "team-search",
		text: "🔎 Find teams fast with our smart search when you're part of many teams.",
		attachTo: { element: "#tour-team-search", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "team-cards",
		text: "📇 Each card shows team info, progress, and your role. Click to dive deeper!",
		attachTo: { element: "#tour-team-card", on: "top" },
		buttons: withBackButton(
			[
				{
					text: "View Team Details",
					action: () => {
						// Try to find a team card and navigate to it
						const teamCard = document.querySelector("#tour-team-card")
						if (teamCard) {
							teamCard.click()
						}
						setTimeout(() => tour.next(), 800)
					},
				},
			],
			tour
		),
	})

	// --- Team Details Page ---
	tour.addStep({
		id: "team-detail-header",
		text: "🎯 Team details page - your mission control for this specific team!",
		attachTo: { element: "#tour-team-header", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "team-tabs",
		text: "📂 Organized tabs: Tasks, Task Groups, Announcements, Members, and Roles management.",
		attachTo: { element: "#tour-team-tabs", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "team-action-buttons",
		text: "🔧 Smart action buttons that adapt to your current tab and permissions.",
		attachTo: { element: "#tour-team-actions", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "tasks-tab-content",
		text: "✅ Tasks tab: View, search, and filter all team tasks with rich details.",
		attachTo: { element: "#tour-tasks-content", on: "top" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "task-search-filters",
		text: "🎛️ Powerful search and filters to manage large task lists efficiently.",
		attachTo: { element: "#tour-task-search", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "announcements-section",
		text: "📢 Team announcements with likes and comments for great team communication.",
		attachTo: { element: "#tour-announcements", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "members-section",
		text: "👤 Team members with roles and permissions - perfect for team management.",
		attachTo: { element: "#tour-members", on: "bottom" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	// --- Task Management ---
	tour.addStep({
		id: "new-task-dialog",
		text: "📝 Create comprehensive tasks with all the details your team needs to succeed!",
		attachTo: { element: "#tour-new-task-dialog", on: "top" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "task-form-fields",
		text: "🎨 Rich task creation: info, priority, scheduling, assignments, and tags - all covered!",
		attachTo: { element: "#tour-task-form", on: "right" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	tour.addStep({
		id: "task-preview",
		text: "👀 Live preview shows exactly how your task will look to team members.",
		attachTo: { element: "#tour-task-preview", on: "left" },
		buttons: withBackButton(
			[{ text: "Next", action: tour.next }],
			tour
		),
	})

	// --- Admin Features ---
	const isAdmin = document.querySelector("#tour-admin-nav")
	if (isAdmin) {
		tour.addStep({
			id: "admin-navigation",
			text: "👑 Admin access unlocked! System-wide management at your fingertips.",
			attachTo: { element: "#tour-admin-nav", on: "right" },
			buttons: withBackButton(
				[
					{
						text: "Go to Admin Panel",
						action: () => {
							router.push("/admin")
							setTimeout(() => tour.next(), 800)
						},
					},
				],
				tour
			),
		})

		tour.addStep({
			id: "admin-panel",
			text: "🛠️ Admin Command Center: Teams, Users, and Announcements management in one place.",
			attachTo: { element: "#tour-admin-panel", on: "bottom" },
			buttons: withBackButton(
				[{ text: "Next", action: tour.next }],
				tour
			),
		})

		tour.addStep({
			id: "admin-teams-tab",
			text: "🏢 Teams overview: member counts, task stats, and full management controls.",
			attachTo: { element: "#tour-admin-teams", on: "bottom" },
			buttons: withBackButton(
				[{ text: "Next", action: tour.next }],
				tour
			),
		})

		tour.addStep({
			id: "admin-users-tab",
			text: "👥 User management: send notifications, manage accounts, keep the platform healthy.",
			attachTo: { element: "#tour-admin-users", on: "bottom" },
			buttons: withBackButton(
				[{ text: "Next", action: tour.next }],
				tour
			),
		})

		tour.addStep({
			id: "admin-announcements-tab",
			text: "📢 System-wide announcements: keep everyone informed and engaged.",
			attachTo: { element: "#tour-admin-announcements", on: "bottom" },
			buttons: withBackButton(
				[{ text: "Next", action: tour.next }],
				tour
			),
		})
	}

	// --- Final Step ---
	tour.addStep({
		id: "tour-complete",
		text: "🎉 Tour complete! You're now ready to master Teams Management. Time to collaborate like a pro!",
		buttons: [
			{
				text: "Start Collaborating!",
				action: tour.complete,
				classes: "shepherd-button-primary",
			},
			{
				text: "Replay Tour",
				action: () => {
					localStorage.removeItem("tour-state")
					tour.cancel()
					setTimeout(() => {
						tour.start()
					}, 400)
				},
				classes: "shepherd-button-secondary",
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
	if (
		shouldResume &&
		startStepIndex > 0 &&
		startStepIndex < tour.steps.length
	) {
		resumeTourAtStep(startStepIndex, startRoute)
	} else {
		tour.start()
	}
}
