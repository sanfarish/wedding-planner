import type { TimelineEvent } from '@wedding/shared'
import { crud } from './crud'

export interface TimelineEventInput {
  title: string
  description: string | null
  eventDate: string
  startTime: string | null
  endTime: string | null
  location: string | null
  category: string | null
}

export const timelineService = crud<TimelineEvent, TimelineEventInput>('/api/timeline')
