# Add Optional Subscription Expiration Dates

## Summary

This PR implements optional end dates for air quality subscriptions, allowing users to specify when their subscription should automatically deactivate. This addresses issue #16.

## Changes Overview

### 🗄️ Database Schema
- Added optional `expiresAt` DateTime field to `UserSubscription` model
- Field is nullable (null = never expires) ensuring full backward compatibility
- All existing subscriptions remain active indefinitely

### 🔧 Backend Implementation

**New Helper Function:**
```typescript
deactivateExpiredSubscriptions(): Promise<number>
```
- Queries subscriptions where `expiresAt <= now` and `active = true`
- Marks them as `active = false` (preserves historical data)
- Returns count of deactivated subscriptions
- Includes logging for monitoring

**API Updates:**
- `/api/verify-code` now accepts optional `expiresAt` parameter
- Stores expiration date when creating subscriptions
- Validates and converts ISO string to DateTime

**Cron Job Enhancement:**
- `updateAirQualityForAllSubscriptions()` now:
  1. Calls `deactivateExpiredSubscriptions()` before processing
  2. Logs deactivation count
  3. Only fetches air quality data for active subscriptions

### 🎨 Frontend UI

**New Components in SubscriptionForm:**
1. **Checkbox** - "Set an end date for this subscription (optional)"
2. **Date Picker** - Native HTML5 input (mobile-friendly)
3. **Helper Text** - "Your subscription will automatically end on this date"
4. **Validation** - Ensures only today or future dates accepted

**User Flow:**
```
Email Input
   ↓
[ ] Set an end date (optional)  ← Checkbox
   ↓ (when checked)
[Date Picker: MM/DD/YYYY]  ← min=today
"Your subscription will automatically end on this date"
   ↓
[Sign Up for Alerts]
```

### ✅ Testing
- Added 2 new test cases for `deactivateExpiredSubscriptions()`
- Updated `mockSubscription` with `expiresAt: null`
- All 80 tests passing ✓
- TypeScript compilation successful ✓
- ESLint checks passed ✓

## UI Screenshots

### Subscription Form - Default State
```
┌────────────────────────────────────────┐
│ Get Air Quality Alerts via Email      │
├────────────────────────────────────────┤
│                                        │
│ [Email: example@domain.com         ]  │
│                                        │
│ ☐ Set an end date (optional)          │
│                                        │
│ [    Sign Up for Alerts    ]           │
│                                        │
└────────────────────────────────────────┘
```

### Subscription Form - With End Date Selected
```
┌────────────────────────────────────────┐
│ Get Air Quality Alerts via Email      │
├────────────────────────────────────────┤
│                                        │
│ [Email: example@domain.com         ]  │
│                                        │
│ ☑ Set an end date (optional)          │
│    [Date: 12/31/2025          ]        │
│    Your subscription will automatically│
│    end on this date                    │
│                                        │
│ [    Sign Up for Alerts    ]           │
│                                        │
└────────────────────────────────────────┘
```

## Implementation Details

### Data Flow
1. User checks "Set an end date" checkbox
2. Date picker appears with `min=today`
3. User selects future date
4. On form submission → verification code sent
5. User enters code
6. `verifyCode()` called with `expiresAt` as ISO string
7. API validates and stores as DateTime in database
8. Daily cron job:
   - Checks for `expiresAt <= now`
   - Marks matching subscriptions as `active = false`
   - Processes only active subscriptions

### Edge Cases Handled
✅ Null `expiresAt` → subscription never expires
✅ Past dates → validation error shown
✅ Unchecking checkbox → clears selected date
✅ ZIP code change → form resets including date
✅ Failed verification → date selection preserved for retry
✅ Expired subscriptions → deactivated but data preserved

### Backward Compatibility
- ✅ Existing subscriptions automatically get `expiresAt = null`
- ✅ No breaking changes to existing API contracts
- ✅ Optional parameter - can be omitted in API calls
- ✅ UI defaults to unchecked (no end date)

## Files Changed

### Database
- `prisma/schema.prisma` - Added `expiresAt` field

### Backend
- `api/_lib/services/subscription.ts` - Interface + helper function
- `api/_lib/services/airQuality.ts` - Cron job update
- `api/verify-code.ts` - Accept and store `expiresAt`

### Frontend
- `src/lib/api.ts` - Client API update
- `src/components/SubscriptionForm.tsx` - UI with date picker

### Tests
- `api/__tests__/subscription.test.ts` - Expiration tests
- `api/__tests__/testUtils.ts` - Mock data update

### Documentation
- `IMPLEMENTATION_PLAN.md` - Detailed implementation plan

## Testing Instructions

### Manual Testing
1. Navigate to app homepage
2. Enter a ZIP code
3. Click "Sign Up for Alerts"
4. Check "Set an end date" checkbox
5. Select a future date
6. Complete verification flow
7. Verify subscription created with `expiresAt` in database

### Automated Testing
```bash
npm test        # All 80 tests should pass
npm run typecheck  # No type errors
npm run lint    # No linting errors
```

### Database Testing
```sql
-- Create a subscription with past expiration
INSERT INTO "UserSubscription" (email, "zipCode", "expiresAt", active)
VALUES ('test@example.com', '12345', NOW() - INTERVAL '1 day', true);

-- Run cron job (or call deactivateExpiredSubscriptions)
-- Verify subscription is now active=false
```

## Breaking Changes
**None** - This is a purely additive feature with full backward compatibility.

## Deployment Notes
1. Database migration will add `expiresAt` column (nullable)
2. Existing subscriptions unaffected (expiresAt=null → never expires)
3. No downtime required
4. Can be rolled back safely

## Future Enhancements (Out of Scope)
- Email notification before expiration
- Ability to extend expiration date
- Bulk expiration management in admin panel
- Analytics on subscription duration

## Related Issues
Closes #16

## Checklist
- [x] Implementation plan created and documented
- [x] Database schema updated
- [x] Backend API updated
- [x] Frontend UI implemented
- [x] Tests written and passing (80/80)
- [x] Type checking passed
- [x] Linting passed
- [x] Code review performed
- [x] Backward compatibility ensured
- [x] Edge cases handled
- [x] Documentation updated
- [x] Commit messages clear and descriptive

## Screenshots
_Note: UI screenshots will be added after deployment to a preview environment._

The UI changes are implemented using:
- Native HTML5 date input for best mobile experience
- Tailwind CSS for consistent styling
- Clear UX with checkbox toggle and helper text
- Proper validation and error messages

---

**Ready for review!** 🚀
