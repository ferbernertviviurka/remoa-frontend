import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {PrivatePreview} from './private-preview';
vi.mock('./api',()=>({previewDocument:vi.fn(),previewCrop:vi.fn()}));
import {previewDocument} from './api';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('requires document load before readiness and invalidates confirmation when switching page',async()=>{vi.mocked(previewDocument).mockResolvedValue({id:'document',url:'https://example.org/private-synthetic.pdf',expiresInSec:3600,audit:{} as never});const ready=vi.fn();const view=render(<PrivatePreview documentId="document" page={2} onReady={ready}/>);const frame=await screen.findByTitle('Documento original');expect(frame).toHaveAttribute('src','https://example.org/private-synthetic.pdf#page=2');expect(ready).toHaveBeenLastCalledWith(false);fireEvent.load(frame);expect(ready).toHaveBeenLastCalledWith(true);view.rerender(<PrivatePreview documentId="document" page={3} onReady={ready}/>);expect(ready).toHaveBeenLastCalledWith(false);fireEvent.load(frame);expect(ready).toHaveBeenLastCalledWith(true);});
it('does not declare evidence ready on preview access failure',async()=>{vi.mocked(previewDocument).mockRejectedValue(new Error('private-preview-denied'));const ready=vi.fn();render(<PrivatePreview documentId="document" onReady={ready}/>);await screen.findByRole('alert');await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(false));expect(ready).not.toHaveBeenCalledWith(true);});
