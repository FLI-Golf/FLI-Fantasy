# User Profile Auto-Creation

## Overview

When a user successfully registers, a `user_profile` record is automatically created with default settings.

## Implementation

### RegisterModal.svelte

Updated to create user_profile after user creation:

```typescript
// Create user account
const user = await pb.collection('users').create({
  email,
  password,
  passwordConfirm,
  name
});

// Create user profile with default role
await pb.collection('user_profile').create({
  user: user.id,
  role: 'participant'  // Default role for new users
});

// Auto-login after registration
await pb.collection('users').authWithPassword(email, password);
```

## user_profile Schema

**Collection:** `user_profile`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `user` | relation | Yes | - | Link to users collection |
| `role` | select | Yes | participant | User role: participant, scorekeeper, admin |
| `assigned_pairing` | number | No | null | For scorekeepers: which pairing (1-6) |

### Roles

**participant** (default)
- Can join fantasy leagues
- Can draft teams
- Can view scores and standings

**scorekeeper**
- Can enter scores for assigned pairing
- Has access to scoring form
- Assigned to specific pairing (1-6)

**admin**
- Can manage tournaments
- Can create rounds and pairings
- Can assign scorekeepers

## Schema Fixed

The `user_profile` collection schema was updated via API to include all required fields:

```typescript
{
  schema: [
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: {
        collectionId: usersCol.id,
        cascadeDelete: true,
        maxSelect: 1
      }
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: {
        maxSelect: 1,
        values: ['participant', 'scorekeeper', 'admin']
      }
    },
    {
      name: 'assigned_pairing',
      type: 'number',
      required: false,
      options: { min: 1, max: 6 }
      }
  ]
}
```

## Testing

✅ Schema updated successfully  
✅ Profile creation tested and working  
✅ RegisterModal updated to auto-create profiles  

## Existing Users

For existing users without profiles, you can create them manually or run a migration script:

```typescript
import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pocketbase-production-e678.up.railway.app');

pb.admins.authWithPassword('admin@email.com', 'password').then(async () => {
  const users = await pb.collection('users').getFullList();
  
  for (const user of users) {
    // Check if profile exists
    const existing = await pb.collection('user_profile').getFullList({
      filter: `user = "${user.id}"`
    });
    
    if (existing.length === 0) {
      await pb.collection('user_profile').create({
        user: user.id,
        role: 'participant'
      });
      console.log(`Created profile for ${user.email}`);
    }
  }
});
```

## Verification

Check in PocketBase Admin:
1. Go to https://pocketbase-production-e678.up.railway.app/_/
2. Navigate to Collections → user_profile
3. Verify schema has: user, role, assigned_pairing fields
4. Check that profiles are created when users register

---

**Status:** ✅ Auto-creation implemented and tested!
