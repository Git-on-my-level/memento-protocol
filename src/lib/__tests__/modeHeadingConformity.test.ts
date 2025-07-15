import * as fs from 'fs';
import * as path from 'path';

describe('Mode Template Heading Conformity', () => {
  const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'templates', 'modes');
  const REQUIRED_HEADINGS = [
    '## Behavioral Guidelines',
    '## Example Process'
  ];

  const getModeFiles = (): string[] => {
    try {
      const files = fs.readdirSync(TEMPLATES_DIR);
      return files.filter(file => file.endsWith('.md') && file !== 'metadata.json');
    } catch (error) {
      return [];
    }
  };

  const extractHeadings = (content: string): string[] => {
    const lines = content.split('\n');
    const headings: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
        headings.push(trimmed);
      }
    }
    
    return headings;
  };

  const modeFiles = getModeFiles();

  if (modeFiles.length === 0) {
    it('should find mode template files', () => {
      expect(modeFiles.length).toBeGreaterThan(0);
    });
  } else {
    modeFiles.forEach(file => {
      describe(`Mode template: ${file}`, () => {
        const filePath = path.join(TEMPLATES_DIR, file);
        let content: string;
        let headings: string[];

        beforeAll(() => {
          content = fs.readFileSync(filePath, 'utf8');
          headings = extractHeadings(content);
        });

        it('should contain all required headings', () => {
          for (const required of REQUIRED_HEADINGS) {
            expect(headings).toContain(required);
          }
        });

        it('should have headings in the correct order', () => {
          const requiredIndices = REQUIRED_HEADINGS.map(req => 
            headings.indexOf(req)
          ).filter(idx => idx !== -1);

          // Check that indices are in ascending order
          for (let i = 1; i < requiredIndices.length; i++) {
            expect(requiredIndices[i]).toBeGreaterThan(requiredIndices[i - 1]);
          }
        });

        it('should not have duplicate headings', () => {
          const headingCounts = new Map<string, number>();
          for (const heading of headings) {
            headingCounts.set(heading, (headingCounts.get(heading) || 0) + 1);
          }

          for (const [heading, count] of headingCounts.entries()) {
            expect({ heading, count }).toEqual({ heading, count: 1 });
          }
        });

        it('should have proper subsections under Example Process', () => {
          const epIndex = content.indexOf('## Example Process');
          const endOfFile = content.length;
          
          if (epIndex !== -1) {
            const epSection = content.substring(epIndex, endOfFile);
            // Check that it contains at least one Phase heading
            expect(epSection).toMatch(/### Phase \d+:/);
          }
        });
      });
    });
  }
});