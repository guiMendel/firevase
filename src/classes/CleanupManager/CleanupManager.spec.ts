import { CleanupManager } from '.'

describe('CleanupManager', () => {
  it.todo('add returns a method to trigger the clenaup early')

  it('should add a callback when calling add, and the callback should only be triggered on the very next disposal', () => {
    const manager = new CleanupManager()

    const callback = vi.fn()

    manager.add(callback)

    manager.dispose()

    expect(callback).toHaveBeenCalledOnce()

    manager.dispose()

    expect(callback).toHaveBeenCalledOnce()
  })

  it('should allow you to listen to all disposals', () => {
    const manager = new CleanupManager()

    const callback = vi.fn()

    manager.onDispose(callback)

    manager.dispose()

    expect(callback).toHaveBeenCalledOnce()

    manager.dispose()

    expect(callback).toHaveBeenCalledTimes(2)
  })

  describe('propagating from another manager', () => {
    it('propagates properly', () => {
      const manager = new CleanupManager()
      const otherManager = new CleanupManager()

      const callback = vi.fn()

      manager.add(callback)

      manager.link('propagate-from', otherManager)

      otherManager.dispose()

      expect(callback).toHaveBeenCalledOnce()
    })

    it("doesn't propagete incorrectly", () => {
      const manager = new CleanupManager()
      const otherManager = new CleanupManager()

      const callback = vi.fn()

      otherManager.add(callback)

      manager.link('propagate-from', otherManager)

      manager.dispose()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('propagating to another manager', () => {
    it('propagates properly', () => {
      const manager = new CleanupManager()
      const otherManager = new CleanupManager()

      const callback = vi.fn()

      otherManager.add(callback)

      manager.link('propagate-to', otherManager)

      manager.dispose()

      expect(callback).toHaveBeenCalledOnce()
    })

    it("doesn't propagete incorrectly", () => {
      const manager = new CleanupManager()
      const otherManager = new CleanupManager()

      const callback = vi.fn()

      manager.add(callback)

      manager.link('propagate-to', otherManager)

      otherManager.dispose()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('propagating both ways', () => {
    it('propagates properly', () => {
      const manager = new CleanupManager()
      const otherManager = new CleanupManager()

      const callback1 = vi.fn()
      const callback2 = vi.fn()

      manager.add(callback1)
      otherManager.add(callback2)

      manager.link('propagate-both', otherManager)

      manager.dispose()

      expect(callback1).toHaveBeenCalledOnce()
      expect(callback2).toHaveBeenCalledOnce()

      manager.add(callback1)
      otherManager.add(callback2)

      otherManager.dispose()

      expect(callback1).toHaveBeenCalledTimes(2)
      expect(callback2).toHaveBeenCalledTimes(2)
    })
  })
})
