import { IGAccount, InstaAccount } from './account';

// concept: time is equally divided among the accounts
// every account should complete it's target activity, if the rate limit is not reached
// there are 2 cycles for an account: one for posting and one for following

interface AccountSchedule {
    post_interval: number;
    post_progress: number;
    follow_interval: number;
    follow_progress: number;
}

export class ActivitySchedule {}
