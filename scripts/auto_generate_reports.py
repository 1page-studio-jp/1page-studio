#!/usr/bin/env python3
"""
Auto-generate monthly reports for all active stores.
Run this script at month-end (cron: 0 0 1 * * = midnight on 1st of each month,
generates report for the previous month).

Usage:
  python3 auto_generate_reports.py [--output-dir /path/to/reports]
"""
import os
import sys
import argparse
import subprocess
from datetime import date, timedelta
from pathlib import Path

# Add project root to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from generate_monthly_report import fetch_store_data, build_pdf

try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


def get_all_active_stores():
    """Fetch all active stores from Supabase."""
    if not SUPABASE_AVAILABLE:
        print("ERROR: supabase-py not installed. Run: pip install supabase")
        sys.exit(1)

    url = os.environ.get('SUPABASE_URL', os.environ.get('NEXT_PUBLIC_SUPABASE_URL', ''))
    key = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''))

    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required")
        sys.exit(1)

    client = create_client(url, key)
    result = client.table('stores') \
        .select('id, store_name') \
        .is_('deleted_at', 'null') \
        .execute()
    return result.data or []


def main():
    parser = argparse.ArgumentParser(description='Auto-generate monthly reports for all stores')
    parser.add_argument('--output-dir', default='/tmp/1page-reports', help='Output directory for PDFs')
    parser.add_argument('--year', type=int, help='Override year (default: last month)')
    parser.add_argument('--month', type=int, help='Override month (default: last month)')
    args = parser.parse_args()

    # Default: generate for previous month
    today = date.today()
    first_of_this_month = today.replace(day=1)
    last_month = first_of_this_month - timedelta(days=1)
    target_year = args.year or last_month.year
    target_month = args.month or last_month.month

    print(f"=== 月次レポート自動生成: {target_year}年{target_month}月 ===")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    stores = get_all_active_stores()
    print(f"対象店舗数: {len(stores)}")

    success, failed = 0, []

    for store in stores:
        store_id = store['id']
        store_name = store['store_name']
        print(f"\n[{store_name}] レポート生成中...")

        try:
            data = fetch_store_data(store_id, target_year, target_month)
            filename = f"report_{store_id}_{target_year}_{str(target_month).zfill(2)}.pdf"
            output_path = str(output_dir / filename)
            build_pdf(data, output_path)
            print(f"  ✓ 生成完了: {output_path}")
            success += 1
        except Exception as e:
            print(f"  ✗ 失敗: {e}")
            failed.append({'store': store_name, 'error': str(e)})

    print(f"\n=== 完了: 成功 {success}/{len(stores)} ===")
    if failed:
        print("失敗した店舗:")
        for f in failed:
            print(f"  - {f['store']}: {f['error']}")
        sys.exit(1)
    else:
        print("全店舗のレポートが正常に生成されました")


if __name__ == '__main__':
    main()
