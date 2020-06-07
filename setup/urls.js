module.exports = [
    /** USERS */
    {
        name: 'add-user',
        url: '/dashboard/users/add'
    },
    {
        name: 'set-picture',
        url: '/dashboard/users/set-picture/:id'
    },
    {
        name: 'crop-picture',
        url: '/dashboard/users/crop-picture/:id'
    },
    {
        name: 'logout',
        url: '/dashboard/users/logout'
    },
    {
        name: 'login',
        url: '/dashboard/users/login'
    },
    {
        name: 'users',
        url: '/dashboard/users/list/:userType/:page/:limit'
    },
    {
        name: 'users-students',
        url: '/dashboard/users/students/:page/:limit'
    },
    {
        name: 'delete-user',
        url: '/dashboard/users/delete/:id'
    },
    {
        name: 'edit-user',
        url: '/dashboard/users/edit/:id'
    },
    {
        name: 'users-profile',
        url: '/dashboard/users/profile/e/:id'
    },
    {
        name: 'generate-keys',
        url: '/dashboard/users/generate-keys'
    },

    /** USER PROFILE */
    {
        name: 'user-profile',
        url: '/dashboard/profile/me'
    },

    /** UNIVERSITIES */
    {
        name: "add-services",
        url: '/dashboard/services/add'
    },
    {
        name: 'set-service-picture',
        url: '/dashboard/services/set-picture/:id'
    },
    {
        name: 'crop-service-picture',
        url: '/dashboard/services/crop-picture/:id'
    },
    {
        name: 'services',
        url: '/dashboard/services/list/:page/:limit'
    },
    {
        name: 'service',
        url: '/dashboard/services/e/:id'
    },
];