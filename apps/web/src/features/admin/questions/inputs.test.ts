import { describe,expect,it } from 'vitest';
import { parseAnswerKeyPages,parseExcludedPages,pdfFileError } from './inputs';
describe('question import human input',()=>{
  it('keeps one-based pages and rejects malformed selections instead of dropping errors',()=>{expect(parseExcludedPages('')).toEqual([]);expect(parseExcludedPages('1, 3,500')).toEqual([1,3,500]);for(const value of ['0','501','1,1','3.5','1,','abc','-1'])expect(parseExcludedPages(value)).toBeNull();});
  it('sorts original answer-key pages, distinguishes all pages from invalid selections',()=>{expect(parseAnswerKeyPages(' ')).toBeNull();expect(parseAnswerKeyPages('3, 1, 2')).toEqual([1,2,3]);for(const value of ['0','501','2,2','1,','abc'])expect(parseAnswerKeyPages(value)).toBeUndefined();});
  it('rejects wrong MIME and extension before upload but delegates binary validation to the server',()=>{expect(pdfFileError(null)).toBe('missing');expect(pdfFileError(new File(['x'],'a.txt',{type:'text/plain'}))).toBe('type');expect(pdfFileError(new File(['x'],'a.pdf',{type:'text/plain'}))).toBe('type');expect(pdfFileError(new File(['x'],'a.PDF',{type:'application/pdf'}))).toBeNull();});
});
