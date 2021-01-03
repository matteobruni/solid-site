import type { Component } from 'solid-js';
import { createMutable } from 'solid-js';
import markdownTreeParser from 'markdown-tree-parser';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/themes/prism.css';

(function addJSXSupport() {
  let javascript = Prism.util.clone(Prism.languages.javascript);
  Prism.languages.jsx = Prism.languages.extend('markup', javascript);
  // @ts-ignore
  Prism.languages.jsx.tag.pattern = /<\/?[\w.:-]+\s*(?:\s+[\w.:-]+(?:=(?:("|')(\\?[\w\W])*?\1|[^\s'">=]+|(\{[\w\W]*?})))?\s*)*\/?>/i;
  // @ts-ignore
  Prism.languages.jsx.tag.inside['attr-value'].pattern = /=[^{](?:('|")[\w\W]*?(\1)|[^\s>]+)/i;
  let jsxExpression = Prism.util.clone(Prism.languages.jsx);
  delete jsxExpression.punctuation;
  jsxExpression = Prism.languages.insertBefore(
    'jsx',
    'operator',
    {
      punctuation: /=(?={)|[{}[\];(),.:]/,
    },
    { jsx: jsxExpression },
  );
  Prism.languages.insertBefore(
    'inside',
    'attr-value',
    {
      script: {
        // Allow for one level of nesting
        pattern: /=(\{(?:\{[^}]*}|[^}])+})/i,
        inside: jsxExpression,
        alias: 'language-javascript',
      },
    },
    // @ts-ignore
    Prism.languages.jsx.tag,
  );
})();

function slugify(text) {
  return text
    .toString() // Cast to string
    .toLowerCase() // Convert the string to lowercase letters
    .normalize('NFD') // The normalize() method returns the Unicode Normalization Form of a given string.
    .trim() // Remove whitespace from both sides of a string
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

const Markdown: Component<{ onLoadSections: Function }> = ({ children, onLoadSections }) => {
  const doc = createMutable(() => {
    let sections = [];
    const astToSolid = (nodes) => {
      if (!nodes || nodes.length === 0) {
        return [];
      }
      return nodes.map((node) => {
        switch (node.name) {
          case 'heading':
            /**
             * We create an empty anchor link here that will
             * be inserted into each header as absolute and positionned
             * 80px (size of the header) above the heading. This way
             * we can smoothly scrool to that title without it being
             * hidden under the sticky header atop.
             */
            const anchor = document.createElement('a');
            anchor.classList.add('absolute');
            anchor.style.bottom = 'calc(100% + 80px)';
            const el = document.createElement(`h${node.level}`);
            el.classList.add(
              'pb-3',
              !sections.length ? 'mb-5' : 'my-5',
              `text-${3 - node.level}xl`,
              'border-b',
              'text-solid',
              'relative',
            );
            el.append(...astToSolid(node.values));
            anchor.setAttribute('id', slugify(el.innerHTML));
            el.prepend(anchor);
            const title = document.createElement('textarea');
            title.innerHTML = el.textContent;
            if (node.level <= 2) {
              sections.push({ id: anchor.id, title: title.value });
            }
            return el;
          case 'orderedlist':
            return (
              <ol class="list-decimal ml-9 my-4">
                {node.values.map((item) => (
                  <li>{astToSolid([item])}</li>
                ))}
              </ol>
            );
          case 'list':
            return (
              <ul class="list-disc ml-9 my-4">
                {node.values.map((item) => (
                  <li>{astToSolid([item])}</li>
                ))}
              </ul>
            );
          case 'link':
            return (
              <a class="text-gray-500 hover:text-solid" href={node.href}>
                {node.title}
              </a>
            );
          case 'italic':
            return <i>{node.value}</i>;
          case 'blockquote':
            return (
              <blockquote class="p-4 my-5 bg-yellow-50 border border-dashed rounded-lg">
                {astToSolid(node.values)}
              </blockquote>
            );
          case 'text':
          case 'paragraph':
            return node.value ? node.value : astToSolid(node.values);
          case 'code':
          case 'inline-code':
            if (node.type === 'block') {
              let code = document.createElement('code');
              code.setAttribute('classNames', 'language-jsx');
              if (node.value) {
                code.innerHTML = Prism.highlight(node.value, Prism.languages.typescript, 'jsx');
              }
              if (node.values) {
                code.innerHTML =
                  code.innerHTML +
                  Prism.highlight(astToSolid(node.values)[0], Prism.languages.typescript, 'jsx');
              }
              return (
                <div class="code leading-6 text-sm shadow-md my-8 rounded-md py-5 px-6">
                  <pre style={{ background: 'none' }} class="poetry">
                    {code}
                  </pre>
                </div>
              );
            } else {
              return <code class="code p-2 rounded">{node.value}</code>;
            }
          // Catchall for clean-up/future additions
          default:
            console.log(node);
        }
      });
    };
    const doc = astToSolid(markdownTreeParser(children).ast);
    onLoadSections(sections);
    return doc;
  });
  return <div class="leading-8">{doc}</div>;
};

export default Markdown;
