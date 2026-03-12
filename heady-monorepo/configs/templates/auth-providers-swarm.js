/**
 * Auth Providers Swarm Configuration
 * Defines OAuth/Auth providers and swarm tasks for auth-provider-bee
 * © 2026 Heady™Systems Inc.
 */

'use strict';

const AUTH_PROVIDERS = {
    google: {
        name: 'Google',
        clientIdEnv: 'GOOGLE_CLIENT_ID',
        clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
        scope: ['openid', 'email', 'profile'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        pkce: true,
    },
    github: {
        name: 'GitHub',
        clientIdEnv: 'GITHUB_CLIENT_ID',
        clientSecretEnv: 'GITHUB_CLIENT_SECRET',
        scope: ['read:user', 'user:email'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        pkce: false,
    },
    discord: {
        name: 'Discord',
        clientIdEnv: 'DISCORD_CLIENT_ID',
        clientSecretEnv: 'DISCORD_CLIENT_SECRET',
        scope: ['identify', 'email'],
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userInfoUrl: 'https://discord.com/api/users/@me',
        pkce: false,
    },
    microsoft: {
        name: 'Microsoft',
        clientIdEnv: 'MICROSOFT_CLIENT_ID',
        clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
        scope: ['openid', 'email', 'profile', 'User.Read'],
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        pkce: true,
    },
};

const SWARM_TASKS = [
    {
        id: 'vector-context-inject',
        name: 'Vector Context Inject',
        description: 'Load identity from 3D memory',
        priority: 1,
        required: false,
    },
    {
        id: 'oauth-init',
        name: 'OAuth Init',
        description: 'Generate auth URL with PKCE',
        priority: 2,
        required: true,
    },
    {
        id: 'token-exchange',
        name: 'Token Exchange',
        description: 'Exchange code for token',
        priority: 3,
        required: true,
    },
    {
        id: 'profile-vectorize',
        name: 'Profile Vectorize',
        description: 'Embed user profile in 3D space',
        priority: 4,
        required: false,
    },
    {
        id: 'session-create',
        name: 'Session Create',
        description: 'Create unified HeadyAuth session',
        priority: 5,
        required: true,
    },
];

module.exports = { AUTH_PROVIDERS, SWARM_TASKS };
