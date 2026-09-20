'use client';

import React, { useState } from 'react';
import { type Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Table as TableIcon,
  Plus,
  Trash2,
  Scissors,
  Columns,
  Square,
  Paintbrush,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Eraser,
  Palette,
  Highlighter,
  ChevronDown,
  Sigma,
  PlusCircle,
  Search
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

type Tab = 'home' | 'insert' | 'layout' | 'academic';

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleSubscript = () => editor.chain().focus().toggleSubscript().run();
  const toggleSuperscript = () => editor.chain().focus().toggleSuperscript().run();

  const setColumns = (cols: 1 | 2) => {
    editor.chain().focus().setSectionColumns(cols).run();
  };

  const isColumns = (cols: number) => {
    return editor.isActive('section', { columns: cols });
  };

  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const deleteTable = () => editor.chain().focus().deleteTable().run();
  const addRow = () => editor.chain().focus().addRowAfter().run();
  const deleteRow = () => editor.chain().focus().deleteRow().run();
  const addColumn = () => editor.chain().focus().addColumnAfter().run();
  const deleteColumn = () => editor.chain().focus().deleteColumn().run();

  const setAlign = (alignment: string) => {
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const handleFind = () => {
    if (!searchTerm) return;
    (editor.chain().focus() as any).setSearchTerm(searchTerm).run();
  };

  const handleNext = () => {
    (editor.chain().focus() as any).nextSearchResult().run();
  };

  const handlePrev = () => {
    (editor.chain().focus() as any).previousSearchResult().run();
  };

  const handleReplace = () => {
    (editor.chain().focus() as any).replace(replaceTerm).run();
  };

  const handleReplaceAll = () => {
    (editor.chain().focus() as any).replaceAll(replaceTerm).run();
  };

  // Close find dialog on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
        (editor.chain() as any).setSearchTerm('').run(); // clear search
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace, editor]);

  const setHeading = (level: 1 | 2 | 3 | 4) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };
  
  const setParagraph = () => {
    editor.chain().focus().setParagraph().run();
  };

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('URL');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const docIdMatch = window.location.pathname.match(/\/workspace\/([^/]+)/);
        if (docIdMatch && docIdMatch[1]) {
          const docId = docIdMatch[1];
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const ext = file.name.split('.').pop() || 'png';
            const assetId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const storagePath = `${user.id}/${docId}/assets/${assetId}`;
            
            const { data, error } = await supabase.storage.from('documents').upload(storagePath, file);
            if (!error && data) {
              (editor.chain().focus() as any).setImage({ storagePath }).run();
            } else {
              console.error('Failed to upload image:', error);
            }
          }
        }
      }
    };
    input.click();
  };

  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();

  const ToolbarButton = ({ 
    isActive = false, 
    onClick, 
    disabled = false, 
    title,
    children 
  }: { 
    isActive?: boolean; 
    onClick?: () => void; 
    disabled?: boolean; 
    title?: string;
    children: React.ReactNode; 
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors flex items-center justify-center min-w-[28px] h-[28px]
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'}
        ${isActive ? 'bg-accent/10 text-accent font-medium' : 'text-foreground-secondary'}
      `}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-[1px] h-[32px] bg-border-light mx-2" />;

  const TabButton = ({ tab, label }: { tab: Tab, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-b-2 ${
        activeTab === tab 
          ? 'border-accent text-accent' 
          : 'border-transparent text-foreground-secondary hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  const ToolGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col items-center px-2 border-r border-border-light/50 last:border-r-0">
      <div className="flex items-center space-x-0.5 h-[32px] mb-1">
        {children}
      </div>
      <span className="text-[9px] text-foreground-muted font-medium uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col bg-[#F8FAFC] border-b border-border-light/50 sticky top-0 z-10 opacity-95 hover:opacity-100 transition-opacity pb-1 shadow-sm">
      {/* Tabs Row */}
      <div className="flex items-center px-2 space-x-1 border-b border-border-light/30">
        <TabButton tab="home" label="Home" />
        <TabButton tab="insert" label="Insert" />
        <TabButton tab="layout" label="Layout" />
        <TabButton tab="academic" label="Academic" />
      </div>

      {/* Tools Row */}
      <div className="flex items-center px-2 py-1.5 min-h-[56px] overflow-x-auto">
        {activeTab === 'home' && (
          <>
            <ToolGroup label="Clipboard">
              <ToolbarButton onClick={undo} disabled={!editor.can().undo()} title="Undo">
                <Undo size={15} />
              </ToolbarButton>
              <ToolbarButton onClick={redo} disabled={!editor.can().redo()} title="Redo">
                <Redo size={15} />
              </ToolbarButton>
              <ToolbarButton onClick={() => {}} title="Format Painter">
                <Paintbrush size={15} />
              </ToolbarButton>
            </ToolGroup>

            <ToolGroup label="Font">
              <div className="flex flex-col justify-center space-y-1 mr-1">
                <div className="flex items-center space-x-1">
                  <select 
                    onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                    className="text-[12px] bg-white border border-border-light outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 w-[110px]"
                    value={editor.getAttributes('textStyle').fontFamily || ''}
                  >
                    <option value="">Default Font</option>
                    <option value="Inter">Inter</option>
                    <option value="var(--font-playfair)">Playfair Display</option>
                    <option value="Arial">Arial</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                  <select 
                    onChange={(e) => (editor.chain().focus() as any).setFontSize(e.target.value).run()}
                    className="text-[12px] bg-white border border-border-light outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 w-[50px]"
                    value={editor.getAttributes('textStyle').fontSize || ''}
                  >
                    <option value="">Size</option>
                    {[8,9,10,11,12,14,16,18,24,30,36,48,72].map(size => (
                      <option key={size} value={`${size}px`}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-0.5">
                  <ToolbarButton onClick={toggleBold} isActive={editor.isActive('bold')} disabled={!editor.can().toggleBold()} title="Bold">
                    <Bold size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={toggleItalic} isActive={editor.isActive('italic')} disabled={!editor.can().toggleItalic()} title="Italic">
                    <Italic size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={toggleUnderline} isActive={editor.isActive('underline')} disabled={!editor.can().toggleUnderline()} title="Underline">
                    <Underline size={14} />
                  </ToolbarButton>
                  
                  <div className="flex items-center space-x-1 ml-1 px-1 border-l border-border-light/50">
                    <div className="relative group flex items-center" title="Text Color">
                      <input 
                        type="color" 
                        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} 
                        value={editor.getAttributes('textStyle').color || '#000000'}
                        className="w-[18px] h-[18px] p-0 border-none rounded cursor-pointer"
                      />
                    </div>
                    <div className="relative group flex items-center" title="Highlight Color">
                      <input 
                        type="color" 
                        onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()} 
                        value={editor.getAttributes('highlight').color || '#ffff00'}
                        className="w-[18px] h-[18px] p-0 border-none rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="border-l border-border-light/50 ml-1 pl-1">
                    <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Clear Formatting">
                      <Eraser size={14} />
                    </ToolbarButton>
                  </div>
                </div>
              </div>
            </ToolGroup>

            <ToolGroup label="Paragraph">
              <div className="flex flex-col justify-center space-y-1">
                <div className="flex items-center space-x-0.5">
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
                    <List size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
                    <ListOrdered size={14} />
                  </ToolbarButton>
                  <div className="w-[1px] h-[14px] bg-border-light mx-1" />
                  <ToolbarButton onClick={() => (editor.chain().focus() as any).outdent().run()} title="Decrease Indent">
                    <Outdent size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => (editor.chain().focus() as any).indent().run()} title="Increase Indent">
                    <Indent size={14} />
                  </ToolbarButton>
                  <div className="w-[1px] h-[14px] bg-border-light mx-1" />
                  <div className="relative group flex items-center">
                    <select 
                      onChange={(e) => (editor.chain().focus() as any).setLineHeight(e.target.value).run()}
                      className="text-[12px] bg-white border border-border-light outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 w-[75px]"
                      value={editor.getAttributes('paragraph').lineHeight || editor.getAttributes('heading').lineHeight || ''}
                    >
                      <option value="">Spacing</option>
                      <option value="1">Single</option>
                      <option value="1.15">1.15</option>
                      <option value="1.5">1.5</option>
                      <option value="2">Double</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-0.5">
                  <ToolbarButton onClick={() => setAlign('left')} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
                    <AlignLeft size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => setAlign('center')} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
                    <AlignCenter size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => setAlign('right')} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
                    <AlignRight size={14} />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => setAlign('justify')} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify">
                    <AlignJustify size={14} />
                  </ToolbarButton>
                </div>
              </div>
            </ToolGroup>

            <ToolGroup label="Styles">
              <div className="flex items-center space-x-1 px-1">
                <button
                  onClick={setParagraph}
                  className={`px-3 py-1.5 border rounded text-[12px] ${editor.isActive('paragraph') ? 'bg-accent/10 border-accent text-accent' : 'bg-white border-border-light hover:bg-black/5'}`}
                  title="Normal Text"
                >
                  Normal
                </button>
                <button
                  onClick={() => setHeading(1)}
                  className={`px-3 py-1.5 border rounded text-[13px] font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-accent/10 border-accent text-accent' : 'bg-white border-border-light hover:bg-black/5'}`}
                  title="Heading 1"
                >
                  Heading 1
                </button>
                <button
                  onClick={() => setHeading(2)}
                  className={`px-3 py-1.5 border rounded text-[12px] font-semibold ${editor.isActive('heading', { level: 2 }) ? 'bg-accent/10 border-accent text-accent' : 'bg-white border-border-light hover:bg-black/5'}`}
                  title="Heading 2"
                >
                  Heading 2
                </button>
              </div>
            </ToolGroup>

            <ToolGroup label="Editing">
              <div className="flex flex-col justify-center space-y-1 pl-1 pr-1">
                <ToolbarButton 
                  onClick={() => setShowFindReplace(!showFindReplace)} 
                  isActive={showFindReplace} 
                  title="Find and Replace"
                >
                  <div className="flex items-center text-[12px] font-medium"><Search size={14} className="mr-1.5"/> Find</div>
                </ToolbarButton>
              </div>
            </ToolGroup>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <ToolGroup label="Pages">
              <ToolbarButton onClick={() => editor.chain().focus().setPageBreak().run()} title="Insert Page Break">
                <div className="flex items-center text-[12px] font-medium"><Scissors size={14} className="mr-1.5"/> Page Break</div>
              </ToolbarButton>
            </ToolGroup>

            <ToolGroup label="Tables">
              <div className="flex items-center space-x-0.5">
                <ToolbarButton onClick={insertTable} title="Insert Table">
                  <div className="flex items-center text-[12px] font-medium"><TableIcon size={14} className="mr-1.5"/> Table</div>
                </ToolbarButton>
                {editor.isActive('table') && (
                  <div className="flex items-center ml-2 space-x-1 pl-2 border-l border-border-light/50">
                    <div className="flex flex-col space-y-0.5">
                      <div className="flex space-x-0.5">
                        <ToolbarButton onClick={addRow} title="Add Row">
                          <div className="flex items-center text-[10px]"><Plus size={10} className="mr-0.5"/> Row</div>
                        </ToolbarButton>
                        <ToolbarButton onClick={addColumn} title="Add Column">
                          <div className="flex items-center text-[10px]"><Plus size={10} className="mr-0.5"/> Col</div>
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().mergeCells().run()} title="Merge Cells">
                          <div className="flex items-center text-[10px]">Merge</div>
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().splitCell().run()} title="Split Cell">
                          <div className="flex items-center text-[10px]">Split</div>
                        </ToolbarButton>
                      </div>
                      <div className="flex space-x-0.5">
                        <ToolbarButton onClick={deleteRow} title="Delete Row">
                          <div className="flex items-center text-[10px] text-red-500"><Trash2 size={10} className="mr-0.5"/> Row</div>
                        </ToolbarButton>
                        <ToolbarButton onClick={deleteColumn} title="Delete Column">
                          <div className="flex items-center text-[10px] text-red-500"><Trash2 size={10} className="mr-0.5"/> Col</div>
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Header Row">
                          <div className="flex items-center text-[10px]">H-Row</div>
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeaderColumn().run()} title="Header Col">
                          <div className="flex items-center text-[10px]">H-Col</div>
                        </ToolbarButton>
                      </div>
                    </div>
                    <div className="pl-1 border-l border-border-light/50 h-full flex items-center">
                      <ToolbarButton onClick={deleteTable} title="Delete Table">
                        <div className="flex items-center text-[10px] text-red-500"><Trash2 size={10} className="mr-0.5"/> Table</div>
                      </ToolbarButton>
                    </div>
                  </div>
                )}
              </div>
            </ToolGroup>

            <ToolGroup label="Illustrations">
              <div className="flex items-center space-x-0.5">
                <ToolbarButton onClick={handleImageUpload} title="Insert Image">
                  <div className="flex items-center text-[12px] font-medium">Image</div>
                </ToolbarButton>
                {editor.isActive('image') && (
                  <ToolbarButton 
                    onClick={() => {
                      const attrs = editor.getAttributes('image');
                      (editor.chain().focus() as any).setFigure({ ...attrs, caption: 'Caption here' }).run();
                    }} 
                    title="Add Caption"
                  >
                    <div className="flex items-center text-[12px] font-medium text-accent">Add Caption</div>
                  </ToolbarButton>
                )}
              </div>
            </ToolGroup>

            <ToolGroup label="Symbols">
              <div className="flex items-center space-x-0.5">
                <ToolbarButton onClick={() => (editor.chain().focus() as any).insertEquation().run()} title="Insert Equation">
                  <div className="flex items-center text-[12px] font-medium"><Sigma size={14} className="mr-1.5"/> Equation</div>
                </ToolbarButton>
                <div className="relative group">
                  <button className="flex flex-col items-center justify-center p-1.5 min-w-[32px] min-h-[32px] rounded text-foreground-secondary hover:bg-black/5 transition-colors" title="Insert Symbol">
                    <div className="flex items-center text-[12px] font-medium"><PlusCircle size={14} className="mr-1.5"/> Symbol</div>
                  </button>
                  {/* Future dropdown for symbols */}
                </div>
              </div>
            </ToolGroup>

            <ToolGroup label="Links">
              <ToolbarButton onClick={toggleLink} isActive={editor.isActive('link')} title="Insert Link">
                <div className="flex items-center text-[12px] font-medium">Link</div>
              </ToolbarButton>
            </ToolGroup>
          </>
        )}

        {activeTab === 'layout' && (
          <>
            <ToolGroup label="Columns">
              <div className="flex items-center space-x-0.5">
                <ToolbarButton onClick={() => setColumns(1)} isActive={isColumns(1)} title="1 Column">
                  <Square size={15} />
                </ToolbarButton>
                <ToolbarButton onClick={() => setColumns(2)} isActive={isColumns(2)} title="2 Columns">
                  <Columns size={15} />
                </ToolbarButton>
              </div>
            </ToolGroup>

            <ToolGroup label="Page Setup">
              <div className="flex items-center space-x-2 text-[12px] text-foreground-secondary h-full">
                <div className="flex flex-col">
                  <select 
                    value={editor.getAttributes('section').pageSize || 'A4'} 
                    onChange={(e) => {
                      // @ts-expect-error custom command
                      editor.chain().focus().setSectionPageSize(e.target.value).run();
                    }}
                    className="bg-transparent border border-border-light rounded px-1.5 py-1 outline-none hover:bg-black/5 cursor-pointer min-w-[100px]"
                    title="Page Size"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">Letter (8.5" × 11")</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <select 
                    value={editor.getAttributes('section').orientation || 'portrait'} 
                    onChange={(e) => {
                      // @ts-expect-error custom command
                      editor.chain().focus().setSectionOrientation(e.target.value).run();
                    }}
                    className="bg-transparent border border-border-light rounded px-1.5 py-1 outline-none hover:bg-black/5 cursor-pointer min-w-[100px]"
                    title="Orientation"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <select 
                    value={editor.getAttributes('section').margins || 'normal'} 
                    onChange={(e) => {
                      // @ts-expect-error custom command
                      editor.chain().focus().setSectionMargins(e.target.value).run();
                    }}
                    className="bg-transparent border border-border-light rounded px-1.5 py-1 outline-none hover:bg-black/5 cursor-pointer min-w-[100px]"
                    title="Margins"
                  >
                    <option value="normal">Normal (1")</option>
                    <option value="narrow">Narrow (0.5")</option>
                    <option value="wide">Wide (2")</option>
                  </select>
                </div>
              </div>
            </ToolGroup>
          </>
        )}

        {activeTab === 'academic' && (
          <>
            <span className="text-[12px] text-foreground-secondary italic px-2">
              Academic tools (Citations, Bibliographies, Footnotes) will be added here in a future update.
            </span>
          </>
        )}
      </div>

      {/* Find & Replace Floating Dialog */}
      {showFindReplace && (
        <div className="absolute top-[60px] right-[20px] bg-white border border-border-light shadow-lg rounded-md p-3 w-[280px] z-20 flex flex-col space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-semibold text-[#0B1628]">Find & Replace</span>
            <button onClick={() => setShowFindReplace(false)} className="text-foreground-muted hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex space-x-1">
            <input 
              autoFocus
              type="text" 
              placeholder="Find..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFind()}
              className="flex-1 text-[12px] border border-border-light rounded px-2 py-1 outline-none focus:border-accent"
            />
            <button onClick={handleFind} className="px-2 bg-accent text-white text-[11px] rounded hover:bg-accent-hover font-medium">Find</button>
          </div>
          <div className="flex space-x-1 justify-end">
            <button onClick={handlePrev} className="px-1.5 py-1 text-[11px] bg-black/5 hover:bg-black/10 rounded">Prev</button>
            <button onClick={handleNext} className="px-1.5 py-1 text-[11px] bg-black/5 hover:bg-black/10 rounded">Next</button>
          </div>
          <div className="flex space-x-1 mt-2">
            <input 
              type="text" 
              placeholder="Replace with..." 
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="flex-1 text-[12px] border border-border-light rounded px-2 py-1 outline-none focus:border-accent"
            />
          </div>
          <div className="flex space-x-1 mt-1 justify-end">
            <button onClick={handleReplace} className="px-2 py-1 bg-black/5 hover:bg-black/10 text-[11px] rounded">Replace</button>
            <button onClick={handleReplaceAll} className="px-2 py-1 bg-black/5 hover:bg-black/10 text-[11px] rounded">Replace All</button>
          </div>
        </div>
      )}
    </div>
  );
}
