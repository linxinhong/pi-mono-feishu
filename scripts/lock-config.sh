#!/bin/bash
#
# 配置文件锁定/解锁工具
#
# 用法:
#   ./scripts/lock-config.sh [lock|unlock|status] [workspace-dir]
#

set -e

WORKSPACE="${2:-$HOME/.pi/feishu}"
ACTION="${1:-status}"

# 需要保护的文件
PROTECTED_FILES=(
    "boot/soul.md"
    "boot/identity.md"
    "boot/tools.md"
)

lock_files() {
    echo "🔒 Locking configuration files..."
    for file in "${PROTECTED_FILES[@]}"; do
        path="$WORKSPACE/$file"
        if [ -f "$path" ]; then
            chmod 600 "$path"
            echo "   🔒 $file (600)"
        else
            echo "   ⚠️  $file (not found)"
        fi
    done
    echo ""
    echo "✅ Configuration files locked (read-only for owner)"
}

unlock_files() {
    echo "🔓 Unlocking configuration files..."
    for file in "${PROTECTED_FILES[@]}"; do
        path="$WORKSPACE/$file"
        if [ -f "$path" ]; then
            chmod 644 "$path"
            echo "   🔓 $file (644)"
        else
            echo "   ⚠️  $file (not found)"
        fi
    done
    echo ""
    echo "⚠️  Configuration files unlocked (editable)"
    echo "   Remember to run: ./scripts/lock-config.sh lock"
}

check_status() {
    echo "📋 Configuration file status:"
    echo ""
    for file in "${PROTECTED_FILES[@]}"; do
        path="$WORKSPACE/$file"
        if [ -f "$path" ]; then
            perms=$(stat -f "%OLp" "$path" 2>/dev/null || stat -c "%a" "$path" 2>/dev/null)
            if [ "$perms" = "600" ]; then
                echo "   🔒 $file (600) - Locked"
            else
                echo "   🔓 $file ($perms) - Unlocked"
            fi
        else
            echo "   ❌ $file (not found)"
        fi
    done
}

case "$ACTION" in
    lock)
        lock_files
        ;;
    unlock)
        unlock_files
        ;;
    status)
        check_status
        ;;
    *)
        echo "Usage: $0 [lock|unlock|status] [workspace-dir]"
        exit 1
        ;;
esac
