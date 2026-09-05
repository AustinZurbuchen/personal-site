import { useSectionEditor } from './useSectionEditor';

// The three quote sections differ by exactly three things -- which slot they
// own, which key editMode opens under, and what the controls are called -- so
// they share this instead of three copies of the same props object.
//
// `index` is the slot in resume.quotes. The dotted paths it builds are the
// server's own ALLOWLIST entries verbatim (personal-site-py/server.py):
// quotes.0.quote, quotes.0.by, quotes.1.quote, ... There is no mapping table
// between a UI field and a database path, which is the property that makes the
// PUT body the dirty subset of `drafts` unchanged.
//
// AN OFF-BY-ONE HERE IS INVISIBLE UNTIL IT WRITES. A wrong `index` opens a field
// showing another band's quote and saves into that band's slot -- the screen
// looks plausible the whole time. src/editflow.test.js pins each section to its
// own slot for exactly this reason.
export const useQuoteEditor = (section, index, name) => {
    const quotePath = 'quotes.' + index + '.quote';
    const byPath = 'quotes.' + index + '.by';

    const editor = useSectionEditor(section, [quotePath, byPath]);

    // Undefined in read mode, so <Titles> renders precisely what it always did.
    const editProps = editor.editing
        ? {
              editing: true,
              // Properties of the section's save, not of one field.
              readOnly: editor.saving,
              describedBy: editor.describedBy,
              onSubmit: editor.save,
              onCancel: editor.closeEditor,
              subtitle: {
                  // Section-prefixed, because three quote editors plus Profile
                  // put four of these on one page and site/index.test.js asserts
                  // every [id] is unique.
                  id: section + '-quoteEdit',
                  label: name + ' quote',
                  value: editor.valueOf(quotePath),
                  onChange: editor.onChangeOf(quotePath),
              },
              by: {
                  id: section + '-byEdit',
                  label: name + ' attribution',
                  value: editor.valueOf(byPath),
                  onChange: editor.onChangeOf(byPath),
              },
          }
        : undefined;

    return { editor, editProps, context: name + ' quote' };
};
