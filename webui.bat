@echo off

E:\llama-b10068-bin-win-cuda-12.4-x64\llama-server.exe ^
    -t -1 ^
    --prio 2 ^
    --poll 0 ^
    --prio-batch 2 ^
    --poll-batch 0 ^
    -c 16384 ^
    -b 2048 ^
    -ub 2048 ^
    --swa-full ^
    -fa on ^
    -kvo ^
    -ctk q8_0 ^
    -ctv q8_0 ^
    --no-mmap ^
    -ngl 999 ^
    -fit off ^
    -m "E:\models\lmstudio-community\gemma-4-12B-it-GGUF\gemma-4-12B-it-Q4_K_M.gguf" ^
    --offline ^
    ^
    -no-kvu ^
    --context-shift ^
    --warmup ^
    -np 1 ^
    -nocb ^
    --no-mmproj ^
    --host 0.0.0.0 ^
    --port 6970 ^
    --path "E:\llama-b10068-bin-win-cuda-12.4-x64\llama-b10068" ^
    -to 60 ^
    --cache-prompt ^
    --cache-reuse 256 ^
    --no-slots ^
    -rea off ^
    --prefill-assistant ^
    -sps 0.10

REM New-NetFirewallRule -DisplayName "llama.cpp" -Protocol UDP -LocalPort 6970 -Action Allow -Profile Private