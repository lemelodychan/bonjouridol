'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './SimpleRichTextEditor.module.scss'
import { FiBold, FiLink } from 'react-icons/fi'

/**
 * Simple Rich Text Editor for Prismic-compatible content
 * Supports: Bold text, Inline links, Paragraphs
 */
export default function SimpleRichTextEditor({ value, onChange, placeholder = 'Enter description...' }) {
  const editorRef = useRef(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkSelection, setLinkSelection] = useState(null)

  // Convert Prismic rich text to HTML
  useEffect(() => {
    if (!editorRef.current || !value) return

    // Only update if editor is empty or value changed significantly
    const currentText = editorRef.current.innerText.trim()
    const valueText = prismicToText(value).trim()
    
    if (currentText !== valueText) {
      const html = prismicToHtml(value)
      editorRef.current.innerHTML = html
    }
  }, [value])

  function prismicToText(prismicData) {
    if (!prismicData || !Array.isArray(prismicData)) return ''
    return prismicData
      .map(block => block.text || '')
      .join('\n')
  }

  function prismicToHtml(prismicData) {
    if (!prismicData || !Array.isArray(prismicData)) return ''
    
    return prismicData
      .map(block => {
        if (!block.text) return '<p><br></p>'
        
        let html = block.text
        const spans = [...(block.spans || [])].sort((a, b) => b.start - a.start)
        
        spans.forEach(span => {
          const before = html.substring(0, span.start)
          const content = html.substring(span.start, span.end)
          const after = html.substring(span.end)
          
          if (span.type === 'strong') {
            html = `${before}<strong>${content}</strong>${after}`
          } else if (span.type === 'hyperlink') {
            const url = span.data?.url || '#'
            html = `${before}<a href="${url}" target="_blank" rel="noopener noreferrer">${content}</a>${after}`
          }
        })
        
        return `<p>${html}</p>`
      })
      .join('')
  }

  function htmlToPrismic(html) {
    if (!html) return []
    
    const div = document.createElement('div')
    div.innerHTML = html
    
    const blocks = []
    const children = Array.from(div.children)
    
    children.forEach(child => {
      if (child.tagName === 'P') {
        const block = {
          type: 'paragraph',
          text: '',
          spans: []
        }
        
        let position = 0
        
        function processNode(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            block.text += node.textContent
            position += node.textContent.length
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const start = position
            
            // Process children first
            Array.from(node.childNodes).forEach(processNode)
            
            const end = position
            
            // Add span for this element
            if (node.tagName === 'STRONG' || node.tagName === 'B') {
              block.spans.push({
                start,
                end,
                type: 'strong'
              })
            } else if (node.tagName === 'A') {
              block.spans.push({
                start,
                end,
                type: 'hyperlink',
                data: {
                  url: node.getAttribute('href') || '#'
                }
              })
            }
          }
        }
        
        Array.from(child.childNodes).forEach(processNode)
        
        // Handle empty paragraphs
        if (!block.text && child.innerHTML === '<br>') {
          block.text = ''
        }
        
        blocks.push(block)
      }
    })
    
    // If no blocks, add empty paragraph
    if (blocks.length === 0) {
      blocks.push({
        type: 'paragraph',
        text: '',
        spans: []
      })
    }
    
    return blocks
  }

  function handleInput() {
    if (!editorRef.current) return
    
    const html = editorRef.current.innerHTML
    const prismicData = htmlToPrismic(html)
    onChange(prismicData)
  }

  function handleBold() {
    document.execCommand('bold', false, null)
    editorRef.current?.focus()
    handleInput()
  }

  function handleLinkClick() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      alert('Please select text first to create a link')
      return
    }
    
    const selectedText = selection.toString()
    if (!selectedText) {
      alert('Please select text first to create a link')
      return
    }
    
    setLinkSelection(selection.getRangeAt(0))
    setShowLinkInput(true)
  }

  function handleInsertLink() {
    if (!linkUrl || !linkSelection) return
    
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(linkSelection)
    
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    document.execCommand('createLink', false, url)
    
    // Set target="_blank" for the created link
    const links = editorRef.current?.querySelectorAll('a[href]:not([target])')
    links?.forEach(link => {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    })
    
    setShowLinkInput(false)
    setLinkUrl('')
    setLinkSelection(null)
    editorRef.current?.focus()
    handleInput()
  }

  function handleCancelLink() {
    setShowLinkInput(false)
    setLinkUrl('')
    setLinkSelection(null)
    editorRef.current?.focus()
  }

  function handleKeyDown(e) {
    // Handle Enter key to create new paragraph
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        // Normal enter - create new paragraph
        e.preventDefault()
        document.execCommand('insertParagraph', false, null)
        handleInput()
      }
    }
  }

  function handlePaste(e) {
    // Prevent pasting formatted content, paste as plain text
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    handleInput()
  }

  return (
    <div className={styles.richTextEditor}>
      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={handleBold}
          className={styles.toolbarButton}
          title="Bold (Ctrl+B)"
        >
          <FiBold />
        </button>
        <button
          type="button"
          onClick={handleLinkClick}
          className={styles.toolbarButton}
          title="Insert Link"
        >
          <FiLink />
        </button>
      </div>

      {showLinkInput && (
        <div className={styles.linkInput}>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL (e.g., https://example.com)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleInsertLink()
              } else if (e.key === 'Escape') {
                handleCancelLink()
              }
            }}
            autoFocus
          />
          <div className={styles.linkActions}>
            <button
              type="button"
              onClick={handleInsertLink}
              className={styles.linkActionButton}
              disabled={!linkUrl}
            >
              Insert
            </button>
            <button
              type="button"
              onClick={handleCancelLink}
              className={`${styles.linkActionButton} ${styles.cancel}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  )
}

