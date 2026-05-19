export type Case311 = {
  service_request_id: string;
  requested_datetime: string;
  closed_date?: string;
  status_description: string;
  service_name?: string;
  service_subtype?: string;
  address?: string;
  neighborhoods_sffind_boundaries?: string;
  source?: string;
  agency_responsible?: string;
};

export type CategoryCount = {
  service_name: string;
  count: string;
};
