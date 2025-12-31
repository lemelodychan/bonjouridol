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
  const lastValueRef = useRef(null)
  const isUpdatingFromInputRef = useRef(false)

  // Convert Prismic rich text to HTML
  useEffect(() => {
    if (!editorRef.current) return

    // Skip if we're updating from user input (prevents cursor reset during typing)
    if (isUpdatingFromInputRef.current) {
      isUpdatingFromInputRef.current = false
      return
    }

    // Compare with last value to avoid unnecessary updates
    const valueStr = JSON.stringify(value)
    if (valueStr === JSON.stringify(lastValueRef.current)) {
      return
    }

    // Compare current HTML with what we would generate
    const currentHtml = editorRef.current.innerHTML
    const newHtml = prismicToHtml(value)
    
    // Only update if HTML is actually different
    if (currentHtml === newHtml) {
      lastValueRef.current = value
      return
    }

    // Save cursor position before updating
    const selection = window.getSelection()
    let startOffset = 0
    let endOffset = 0
    
    if (selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0)
      
      // Calculate start offset
      const preRange = range.cloneRange()
      preRange.selectNodeContents(editorRef.current)
      preRange.setEnd(range.startContainer, range.startOffset)
      startOffset = preRange.toString().length
      
      // Calculate end offset
      const postRange = range.cloneRange()
      postRange.selectNodeContents(editorRef.current)
      postRange.setEnd(range.endContainer, range.endOffset)
      endOffset = postRange.toString().length
    }
    
    // Update HTML
    editorRef.current.innerHTML = newHtml
    lastValueRef.current = value
    
    // Restore cursor position
    if (startOffset > 0 || endOffset > 0) {
      try {
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        )
        
        let currentOffset = 0
        let startNode = null
        let startNodeOffset = 0
        let endNode = null
        let endNodeOffset = 0
        
        while (walker.nextNode()) {
          const node = walker.currentNode
          const nodeLength = node.textContent.length
          
          if (!startNode && currentOffset + nodeLength >= startOffset) {
            startNode = node
            startNodeOffset = startOffset - currentOffset
          }
          
          if (!endNode && currentOffset + nodeLength >= endOffset) {
            endNode = node
            endNodeOffset = endOffset - currentOffset
            break
          }
          
          currentOffset += nodeLength
        }
        
        if (startNode) {
          const newRange = document.createRange()
          const startPos = Math.min(startNodeOffset, startNode.textContent.length)
          newRange.setStart(startNode, startPos)
          
          if (endNode) {
            const endPos = Math.min(endNodeOffset, endNode.textContent.length)
            newRange.setEnd(endNode, endPos)
          } else {
            newRange.setEnd(startNode, startPos)
          }
          
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      } catch (e) {
        // If restoration fails, just focus the editor
        editorRef.current.focus()
      }
    } else if (newHtml) {
      // If no selection but we have content, focus the editor
      editorRef.current.focus()
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
    
    // Mark that we're updating from user input to prevent cursor reset
    isUpdatingFromInputRef.current = true
    
    const html = editorRef.current.innerHTML
    const prismicData = htmlToPrismic(html)
    onChange(prismicData)
  }

  function handleBold() {
    document.execCommand('bold', false, null)
    editorRef.current?.focus()
    isUpdatingFromInputRef.current = true
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
    isUpdatingFromInputRef.current = true
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
        isUpdatingFromInputRef.current = true
        handleInput()
      }
    }
  }

  function handlePaste(e) {
    // Prevent pasting formatted content, paste as plain text
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    isUpdatingFromInputRef.current = true
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

