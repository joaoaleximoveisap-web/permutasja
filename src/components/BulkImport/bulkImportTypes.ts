export interface ImportSession {
  id: string;
  source_url: string;
  total_found: number;
  total_done: number;
  total_failed: number;
  status: 'scanning' | 'processing' | 'done' | 'cancelled' | 'failed';
  created_at: string;
}

export interface ImportJob {
  id: string;
  session_id: string;
  property_url: string;
  status: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  raw_data?: {
    title: string;
    price: number | string;
    area: number | string;
    bedrooms: number;
    images: string[];
    description: string;
    location: string;
  };
  is_duplicate: boolean;
  error_log?: string;
}