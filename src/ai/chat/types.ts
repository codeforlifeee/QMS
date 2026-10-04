import type { Citation } from '../citations';
import type { StoredLine, StoredDay } from '../../data/schema';

export interface ProposedChange {
  type: 'add_line' | 'update_line' | 'remove_line' | 'update_day' | 'set_field';
  description: string;
  before?: Partial<StoredLine | StoredDay>;
  after?: Partial<StoredLine | StoredDay>;
  citation?: Citation;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  proposedChanges?: ProposedChange[];
  applied?: boolean;
}

export interface ChatSession {
  quotationId: string;
  turns: ChatTurn[];
  provider: string;
}
