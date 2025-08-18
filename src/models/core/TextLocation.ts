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
  location: TextLocation;
}

export interface Table {
  id: string;
  caption?: string;
  headers: string[];
  rows: string[][];
  location: TextLocation;
}

export interface Figure {
  id: string;
  caption?: string;
  type: 'image' | 'chart' | 'diagram';
  location: TextLocation;
}

export interface Reference {
  id: string;
  text: string;
  url?: string;
  location: TextLocation;
}
