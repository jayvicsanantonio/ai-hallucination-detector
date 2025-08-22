// Text location and positioning interfaces

export interface TextLocation {
  start: number;
  end: number;
  line?: number;
  column?: number;
  section?: string;
}

export interface DocumentStructure {
  sections: Section[];
  tables: Table[];
  figures: Figure[];
  references: Reference[];
}

export interface Section {
  id: string;
  title: string;
  content: string;
  level: number;
  startLine?: number;
  endLine?: number;
  location?: TextLocation;
  type?: string;
  itemCount?: number;
  index?: number;
}

export interface Table {
  id: string;
  caption?: string;
  headers?: string[];
  rows?: string[][];
  location?: TextLocation;
  startLine?: number;
  endLine?: number;
  columns?: number;
  data?: any[];
  path?: string;
}

export interface Figure {
  id: string;
  caption?: string;
  type?: string;
  location?: TextLocation;
  line?: number;
  path?: string;
  properties?: string[];
}

export interface Reference {
  id: string;
  text: string;
  url?: string;
  location?: TextLocation;
  line?: number;
  context?: string;
  type?: string;
  path?: string;
}
