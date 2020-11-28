export const PredefinedEvents: {
  [eventTitle: string]: PredefinedEvent
} = {
  'e7s': {
    eventTitle: 'E7S 出團調查'
  }
}

export interface PredefinedEvent {
  eventTitle: string;
}
