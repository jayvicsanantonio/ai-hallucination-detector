import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IssueBreakdown } from '../../../../src/ui/dashboard/components/IssueBreakdown';
import { Issue } from '../../../../src/models/core/VerificationResult';

const mockIssues: Issue[] = [
  {
    id: 'issue-1',
    type: 'factual_error',
    severity: 'high',
    description: 'Sd',
    confidence:92,
    location: {
      line: 5,
      start: 12
      
    },
    evidence: ['Source data shows different],
    suggestedFix: 'Verify the statistical claimces',
    mocker'
  },
  {
    
   ncy',
    severity: 'medium',
    description: 'Contrfound',
    confidence: 78,
    location: {
      line: 12,
      start: 34
      end: 420
    },
    ev B'],
    suggestedFix: 'Resolve the logical contradiction',
    moduleSource: 'logic-analyzer'
  },
  {
    id: 'issue-3',
    type: 'compliance_vioation',
    severity: 'critical',
    description: 'G
    confidence: 95,
    location: {
      line: 8,
      start: 200,
      
    },
    evidence: ['Personal data processing without c
    s',
  r'

];

describe('I {
  it('renders issue breakdown with correct count', () => {
    re
 
    expect(
  });

  it( {
/>);
    
    expect(t();
    expect(screen.getByText('Factual Error')).toBeInTheDocument();
    ext();
;
  });

  it('displ=> {
    render(<IssueBreakdown issues={mockIssues} >);
    
    expect(;
    expect(screen.getByText('Critical')).toBeIent();
    expect(screen.getByTexnt();
    e);


  it('shows{
    render(<IssueBreakdown issues={mockIssues} verificationId="test-12);
    
ach
    const counts = screen.getAllByText('1');
    expect(counts).toHaveLength(6); // 3 types + 3 severities
  });

  it(=> {

    
    expect(;
    expect(screen.getByText('Contradictory statements found')).toBeInTocument();
    ex();
;

  it('shows confidence percentages for each 
    render(<IssueBreakdown issues={mockIssues} verificationId;
    
;
    expect(screen.getByText('78% confidence')).toBeInTh
    expect(t();
  });

 () => {
    render(
    
    expect(screen.getByTexocument();
    expect(
    expect(screen.getByText('Line 8, Characters 200-280'
  });

  it('shows evidence when available', () => {
    render(<IssueBreakdown
    

    expect(screen.getByText('Multiple sources contradict thment();
    expect(
  });


    render(<IssueBreakdown issues={mockIssues} verificationId="test;
    
    expect(screen.getByText('Verify the statistical claim with reli
    e);
ument();
  });

  it('filters issues by type correctly', () => {
    re/>);
   
    const tes');
    fireEvent.change(typeFilter, { target: { value: ' } });
    
    expect(
    expect(screen.queryByText('Contradictory statemenent();
    expect(screen.queryByTcument();
  });

  it('filters issues by se{
    r;

    const severityFilter = screen.getByDisplaerities');
    fireEve' } });
    
    ex
ument();
    expect(
  });

  it('shows
    render(<IssueBreakdown issues={mockIssues} verificationId="t />);
    
    const s
    fireEvent.change(severityFilter, { target: { value: 'low');
    
    e);
  });

  it('handl => {
    render(<IssueBreakdown issues={mockIssues} verificationId="test-12);
    
);
    expect(;
    
    fireEvent.click(firstIssue!);
    exp
    
    // Clicct
    fireEvent.click(firstIssue!);
    expect(firstIssue).notected');
  });

  it('renders with empty i) => {
    r

    expect(screen.getByText('Issue Analysis (0 i;
    expect(ument();
  });

{
    const issuesWithoutEvidence: Issue[] = [{
      id: 'issue-4',
      type: 'factual_error',
      sw',

      confi
      location: { line: 1, start: 0, end: 10 },
      evidence: [],
      sugge,
      moduleSource: 'fact-checker'
    }];

    render(<IssueBreakdown issues={issuesWithoutEvidence}  />);
    
    e;

  });

  it('handles issues without suggested fixes gracefully', () => {
    co= [{

      type: 'factual_error',
      severity: 'low',
      description: 'Minor factual issue',
      c,

      evidece'],
      suggestedFix: undefined,
      moduleSource: 'fact-ker'
    }];

    render(<IssueBreakdown iss
    
    expect(screen.getByText('Minor factual issue')).toBeIn
    expect(screen.queryByText(nt();
  });
});