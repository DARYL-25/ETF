#!/usr/bin/env python3
"""Temporary probe: industry classification lists for Chinese listed companies. Plain GET requests only."""
import urllib.request
H = {"User-Agent": "ETF Intelligence data collection (contact via etf-intelligence.com)", "Referer": "https://www.sse.com.cn/"}
for label, url in [
    ("SSE stock list A", "https://query.sse.com.cn/sseQuery/commonQuery.do?sqlId=COMMON_SSE_CP_GPJCTPZ_GPLB_GP_L&isPagination=true&STOCK_TYPE=1&REG_PROVINCE=&CSRC_CODE=&STOCK_CODE=&pageHelp.cacheSize=1&pageHelp.beginPage=1&pageHelp.pageSize=3&pageHelp.pageNo=1"),
    ("SSE stock list STAR", "https://query.sse.com.cn/sseQuery/commonQuery.do?sqlId=COMMON_SSE_CP_GPJCTPZ_GPLB_GP_L&isPagination=true&STOCK_TYPE=8&pageHelp.pageSize=3&pageHelp.pageNo=1&pageHelp.beginPage=1"),
    ("SZSE stock list", "https://www.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=1110&TABKEY=tab1&PAGENO=1"),
    ("CSIndex industry", "https://www.csindex.com.cn/csindex-home/index/industry-classification"),
]:
    try:
        b = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=30).read()
        print("###", label, len(b), b[:900].decode("utf-8", "replace").replace("\n", " "))
    except Exception as e: print("###", label, "ERROR", e)
