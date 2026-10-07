-- Drop the old constraint
ALTER TABLE call_responses DROP CONSTRAINT IF EXISTS call_responses_call_status_check;

-- Add the new constraint with updated values from the UI
ALTER TABLE call_responses ADD CONSTRAINT call_responses_call_status_check CHECK (
  call_status IN (
    'Call Not Connected',
    'Talk in Progress',
    'Traveler Will Finalize – My Hot',
    'Warm Lead',
    'Won''t Book / Rejected'
  )
);
