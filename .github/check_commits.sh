#!/bin/sh

head="$GITHUB_BASE_REF"
current="$(git rev-parse HEAD)"

if ! git merge-base --is-ancestor "origin/${head}" "$current"; then
    printf "Forgotten to rebase on top of %s.\nExiting with error!\n" "$head"
    exit 1
fi

if [ "$(git rev-list --count --merges "origin/${head}..${current}")" -ne 0 ]; then
    printf "There are merge commits on the branch.\nExiting with error!\n"
    exit 1
fi

echo Branch up-to-date and commits ok.
