/** Max milliseconds we can wait before replying *anything* to a Discord interaction
 * to prevent timeout.
 * `If the 3 second deadline is exceeded, the token will be invalidated.`
 * 2.5 seconds to play it safe
 */
export const INTERACTION_PROCESS_MS = 2.5 * 1000;
export const DEFAULT_TIMEOUT_PREVENTION_RESPONSE = "Loading...";

export const ERROR_TRIGGER = Symbol("error symbol");

export const TYPO_TRIGGER = Symbol("typo symbol");

export const RUN_ACTION_TRIGGER = Symbol("runAction symbol");
