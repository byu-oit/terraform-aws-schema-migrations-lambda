branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != "master" ]]
then
  echo "You must be on the master branch to release!"
  exit 1
fi

if [[ -n $(git status -s) ]]
then
  echo "Please commit any changes before merging to release"
  exit 1
fi

for tag in "$@"
do
  if git rev-parse "$tag" >/dev/null 2>&1; then
    # Tag already exists
    read -s -n 1 -p "$tag already exists. To force push, press <enter>" forcePush
    if [ $forcePush != '' ]; then continue; fi

    git tag -fa $tag -m "Update ${tag}"
    git push --force origin $tag
    echo "Updated tag $tag"
  else
    # Tag does not yet exist
    git tag -a $tag -m "Release ${tag}"
    git push origin $tag
    echo "Created tag $tag"
  fi
done