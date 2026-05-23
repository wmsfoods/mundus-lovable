export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  formatted: string;
}